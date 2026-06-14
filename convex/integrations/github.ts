import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUserId } from "../lib/auth";
import { requireWorkspaceRole } from "../lib/authz";
import { assertWorkspaceAccess, insertEvent } from "../lib/eventsLib";
import {
  actorValidator,
  entityValidator,
  eventCategoryValidator,
  eventSourceValidator,
} from "../lib/validators";
import { getWorkspaceDocByExternalId } from "../lib/workspacesLib";
import {
  assertWebhookSecretAccess,
  createWebhookSecretDoc,
  generateRawWebhookSecret,
  getActiveSecretForWorkspace,
  revokeActiveSecretsForWorkspace,
  revokeWebhookSecretDoc,
  docToWebhookSecretRecord,
} from "../lib/githubWebhookSecretsLib";
import type {
  CreateGithubWebhookSecretResult,
  GithubWebhookSecretRecord,
} from "../../src/types/github-integration";

function validateIntegrationServerKey(serverKey: string): void {
  const expected = process.env.SORTIRI_INTEGRATION_SERVER_KEY;
  if (!expected || serverKey !== expected) {
    throw new Error("Unauthorized");
  }
}

function toPublicWebhookSecretRecord(
  doc: Parameters<typeof docToWebhookSecretRecord>[0],
  workspaceExternalId: string,
): GithubWebhookSecretRecord {
  return {
    ...docToWebhookSecretRecord(doc),
    workspaceId: workspaceExternalId,
  };
}

export const createWebhookSecret = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<CreateGithubWebhookSecretResult> => {
    const userId = await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    await revokeActiveSecretsForWorkspace(ctx, workspace._id);

    const rawSecret = generateRawWebhookSecret();
    const last4 = rawSecret.slice(-4);

    const secretId = await createWebhookSecretDoc(ctx, {
      workspaceId: workspace._id,
      secret: rawSecret,
      last4,
    });

    return {
      secretId,
      rawSecret,
      last4,
    };
  },
});

export const listWebhookSecrets = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<GithubWebhookSecretRecord[]> => {
    const userId = await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);
    const docs = await ctx.db
      .query("githubWebhookSecrets")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .collect();

    return docs.map((doc) => toPublicWebhookSecretRecord(doc, workspace.externalId));
  },
});

export const revokeWebhookSecret = mutation({
  args: {
    secretId: v.id("githubWebhookSecrets"),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireUserId(ctx);
    const secret = await assertWebhookSecretAccess(ctx, args.secretId, userId);
    const workspace = await ctx.db.get(secret.workspaceId);
    if (workspace) {
      await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);
    }
    await revokeWebhookSecretDoc(ctx, args.secretId);
  },
});

export const getActiveSecretForServer = query({
  args: {
    workspaceExternalId: v.string(),
    serverKey: v.string(),
  },
  handler: async (ctx, args): Promise<{ secret: string } | null> => {
    validateIntegrationServerKey(args.serverKey);

    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
    const secretDoc = await getActiveSecretForWorkspace(ctx, workspace._id);
    if (!secretDoc) {
      return null;
    }

    return { secret: secretDoc.secret };
  },
});

export const recordGithubEvent = mutation({
  args: {
    serverKey: v.string(),
    workspaceExternalId: v.string(),
    deliveryId: v.optional(v.string()),
    githubEventType: v.optional(v.string()),
    source: eventSourceValidator,
    category: eventCategoryValidator,
    type: v.string(),
    actor: actorValidator,
    title: v.string(),
    summary: v.optional(v.string()),
    entity: v.optional(entityValidator),
    data: v.optional(v.any()),
    occurredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    validateIntegrationServerKey(args.serverKey);

    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);

    if (args.deliveryId) {
      const existing = await ctx.db
        .query("integrationDeliveries")
        .withIndex("by_source_delivery", (q) =>
          q.eq("source", "github").eq("deliveryId", args.deliveryId!),
        )
        .unique();

      if (existing?.status === "processed") {
        return { ok: true as const, duplicate: true as const };
      }
    }

    try {
      const eventId = await insertEvent(ctx, {
        workspaceId: workspace._id,
        source: args.source,
        category: args.category,
        type: args.type,
        actor: args.actor,
        title: args.title,
        summary: args.summary,
        entity: args.entity,
        data: args.data,
        occurredAt: args.occurredAt,
      });

      if (args.deliveryId) {
        await ctx.db.insert("integrationDeliveries", {
          workspaceId: workspace._id,
          source: "github",
          deliveryId: args.deliveryId,
          eventType: args.githubEventType,
          status: "processed",
          createdAt: Date.now(),
        });
      }

      return { ok: true as const, duplicate: false as const, eventId };
    } catch (error) {
      if (args.deliveryId) {
        await ctx.db.insert("integrationDeliveries", {
          workspaceId: workspace._id,
          source: "github",
          deliveryId: args.deliveryId,
          eventType: args.githubEventType,
          status: "failed",
          error: error instanceof Error ? error.message : "Failed to record event",
          createdAt: Date.now(),
        });
      }
      throw error;
    }
  },
});

export const sendTestEvent = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const eventId = await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "github",
      category: "system_event",
      type: "github.test_event",
      actor: {
        type: "system",
        name: "Sortiri Sources",
      },
      title: "GitHub test event received",
      summary: "Sample GitHub webhook event for connection testing.",
      data: {
        test: true,
      },
    });

    return { eventId };
  },
});

/** Dev/test helper — provision a webhook secret without UI auth. */
export const provisionWebhookSecretForServer = mutation({
  args: {
    serverKey: v.string(),
    workspaceExternalId: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    validateIntegrationServerKey(args.serverKey);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);

    await revokeActiveSecretsForWorkspace(ctx, workspace._id);
    const secretId = await createWebhookSecretDoc(ctx, {
      workspaceId: workspace._id,
      secret: args.secret,
      last4: args.secret.slice(-4),
    });

    return { secretId };
  },
});
