import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { requireWorkspaceRole } from "./lib/authz";
import { assertWorkspaceAccess } from "./lib/eventsLib";
import { createApiKeyForCliSetup } from "./lib/apiKeysLib";
import {
  assertSetupTokenAccess,
  createSetupTokenDoc,
  docToCliSetupTokenRecord,
  findTokenByHash,
  generateRawSetupToken,
  getSetupTokenExpiry,
  hashSetupToken,
  markTokenExpired,
  markTokenUsed,
  maskTokenStatus,
  resolveTokenError,
  revokeSetupTokenDoc,
} from "./lib/cliSetupLib";
import { ensureProjectForRepo } from "./lib/projectsLib";
import { getWorkspaceDocByExternalId } from "./lib/workspacesLib";
import type {
  ConsumeSetupTokenResult,
  CreateSetupTokenResult,
} from "../src/types/cli-setup";

const SETUP_TOKEN_PREFIX = "stup_sortiri";

function validateIntegrationServerKey(serverKey: string): void {
  const expected = process.env.SORTIRI_INTEGRATION_SERVER_KEY;
  if (!expected || serverKey !== expected) {
    throw new Error("Unauthorized");
  }
}

export const createToken = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<CreateSetupTokenResult> => {
    const userId = await requireUserId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const rawToken = generateRawSetupToken();
    const tokenHash = await hashSetupToken(rawToken);
    const last4 = rawToken.slice(-4);
    const expiresAt = getSetupTokenExpiry();

    const tokenId = await createSetupTokenDoc(ctx, {
      workspaceId: workspace._id,
      tokenHash,
      last4,
      expiresAt,
      createdBy: {
        userId,
        email: identity?.email,
        name: identity?.name,
      },
    });

    return { tokenId, rawToken, expiresAt };
  },
});

export const consumeToken = mutation({
  args: {
    rawToken: v.string(),
  },
  handler: async (ctx, args): Promise<ConsumeSetupTokenResult> => {
    if (!args.rawToken.startsWith(`${SETUP_TOKEN_PREFIX}_`)) {
      return { ok: false, error: "invalid" };
    }

    const tokenHash = await hashSetupToken(args.rawToken);
    const doc = await findTokenByHash(ctx, tokenHash);
    if (!doc) {
      return { ok: false, error: "invalid" };
    }

    const error = resolveTokenError(doc);
    if (error) {
      if (error === "expired" && doc.status === "active") {
        await markTokenExpired(ctx, doc._id);
      }
      return { ok: false, error };
    }

    await markTokenUsed(ctx, doc._id);
    return { ok: true, workspaceId: doc.workspaceId };
  },
});

export const completeSetup = mutation({
  args: {
    rawToken: v.string(),
    repo: v.optional(
      v.object({
        name: v.optional(v.string()),
        repositoryUrl: v.optional(v.string()),
        localPath: v.optional(v.string()),
        gitBranch: v.optional(v.string()),
      }),
    ),
    editor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.rawToken.startsWith(`${SETUP_TOKEN_PREFIX}_`)) {
      throw new Error("Invalid token");
    }

    const tokenHash = await hashSetupToken(args.rawToken);
    const doc = await findTokenByHash(ctx, tokenHash);
    if (!doc) {
      throw new Error("Invalid token");
    }

    const tokenError = resolveTokenError(doc);
    if (tokenError === "used") {
      throw new Error("Token already used");
    }
    if (tokenError === "revoked") {
      throw new Error("Token revoked");
    }
    if (tokenError === "expired") {
      if (doc.status === "active") {
        await markTokenExpired(ctx, doc._id);
      }
      throw new Error("Token expired");
    }

    const workspace = await ctx.db.get(doc.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const projectName =
      args.repo?.name?.trim() ||
      (args.repo?.localPath
        ? args.repo.localPath.split("/").filter(Boolean).pop()
        : undefined) ||
      "Untitled Project";

    const project = await ensureProjectForRepo(ctx, {
      workspaceId: doc.workspaceId,
      name: projectName,
      repositoryUrl: args.repo?.repositoryUrl,
      localPath: args.repo?.localPath,
    });

    const { rawKey } = await createApiKeyForCliSetup(ctx, {
      workspaceId: doc.workspaceId,
      projectName: project.name,
    });

    await markTokenUsed(ctx, doc._id);

    return {
      workspaceExternalId: workspace.externalId,
      workspaceName: workspace.name,
      projectId: project._id,
      projectName: project.name,
      apiKey: rawKey,
    };
  },
});

export const revokeToken = mutation({
  args: {
    tokenId: v.id("cliSetupTokens"),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireUserId(ctx);
    const token = await assertSetupTokenAccess(ctx, args.tokenId, userId);
    const workspace = await ctx.db.get(token.workspaceId);
    if (workspace) {
      await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);
    }
    await revokeSetupTokenDoc(ctx, args.tokenId);
  },
});

export const listRecent = query({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    const limit = args.limit ?? 10;

    const docs = await ctx.db
      .query("cliSetupTokens")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .take(limit);

    return docs.map((doc) => ({
      ...docToCliSetupTokenRecord(doc, workspace.externalId),
      status: maskTokenStatus(doc),
    }));
  },
});

/** Dev/test helper — provision a setup token without UI auth. */
export const provisionSetupTokenForServer = mutation({
  args: {
    serverKey: v.string(),
    workspaceExternalId: v.string(),
  },
  handler: async (ctx, args): Promise<CreateSetupTokenResult> => {
    validateIntegrationServerKey(args.serverKey);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);

    const rawToken = generateRawSetupToken();
    const tokenHash = await hashSetupToken(rawToken);
    const last4 = rawToken.slice(-4);
    const expiresAt = getSetupTokenExpiry();

    const tokenId = await createSetupTokenDoc(ctx, {
      workspaceId: workspace._id,
      tokenHash,
      last4,
      expiresAt,
      createdBy: { name: "Server provision" },
    });

    return { tokenId, rawToken, expiresAt };
  },
});
