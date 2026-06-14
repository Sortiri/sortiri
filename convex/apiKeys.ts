import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { requireWorkspaceRole } from "./lib/authz";
import { assertWorkspaceAccess } from "./lib/eventsLib";
import {
  assertApiKeyAccess,
  createApiKeyDoc,
  generateRawApiKey,
  hashApiKey,
  markApiKeyUsedDoc,
  revokeApiKeyDoc,
  verifyApiKeyByRawKey,
  docToApiKeyRecord,
} from "./lib/apiKeysLib";
import type { ApiKeyRecord, CreateApiKeyResult, VerifyApiKeyResult } from "../src/types/api-keys";

function toPublicApiKeyRecord(
  doc: Parameters<typeof docToApiKeyRecord>[0],
  workspaceExternalId: string,
): ApiKeyRecord {
  const record = docToApiKeyRecord(doc);
  return {
    ...record,
    workspaceId: workspaceExternalId,
  };
}

export const create = mutation({
  args: {
    workspaceId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args): Promise<CreateApiKeyResult> => {
    const userId = await requireUserId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const rawKey = generateRawApiKey();
    const keyHash = await hashApiKey(rawKey);
    const last4 = rawKey.slice(-4);

    const apiKeyId = await createApiKeyDoc(ctx, {
      workspaceId: workspace._id,
      name: args.name.trim() || "Default Ingest Key",
      keyHash,
      last4,
      createdBy: {
        userId,
        email: identity?.email,
        name: identity?.name,
      },
    });

    return {
      apiKeyId,
      rawKey,
      last4,
    };
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<ApiKeyRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    const docs = await ctx.db
      .query("apiKeys")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .collect();

    return docs.map((doc) => toPublicApiKeyRecord(doc, workspace.externalId));
  },
});

export const revoke = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireUserId(ctx);
    const apiKey = await assertApiKeyAccess(ctx, args.apiKeyId, userId);
    const workspace = await ctx.db.get(apiKey.workspaceId);
    if (workspace) {
      await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);
    }
    await revokeApiKeyDoc(ctx, args.apiKeyId);
  },
});

export const verifyForIngest = query({
  args: {
    rawKey: v.string(),
  },
  handler: async (ctx, args): Promise<VerifyApiKeyResult> => {
    const result = await verifyApiKeyByRawKey(ctx, args.rawKey);
    if (!result.valid) {
      return {
        valid: false,
        revoked: result.revoked,
      };
    }

    return {
      valid: true,
      workspaceExternalId: result.workspaceDoc.externalId,
      apiKeyId: result.apiKeyId,
    };
  },
});

export const getHealthInfo = query({
  args: {
    rawKey: v.string(),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const result = await verifyApiKeyByRawKey(ctx, args.rawKey);
    if (!result.valid) {
      return { ok: false as const, revoked: result.revoked };
    }

    const keyDoc = await ctx.db.get(result.apiKeyId);
    if (!keyDoc) {
      return { ok: false as const };
    }

    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.workspaceId !== result.workspaceDoc._id) {
        return { ok: false as const, projectInvalid: true };
      }
    }

    return {
      ok: true as const,
      workspaceId: result.workspaceDoc.externalId,
      workspaceName: result.workspaceDoc.name,
      apiKeyLast4: keyDoc.last4,
    };
  },
});

export const markUsed = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args): Promise<void> => {
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.status !== "active") {
      return;
    }
    await markApiKeyUsedDoc(ctx, args.apiKeyId);
  },
});
