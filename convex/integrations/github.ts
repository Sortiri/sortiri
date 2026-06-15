import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUserId } from "../lib/auth";
import { requireWorkspaceRole } from "../lib/authz";
import { insertEvent } from "../lib/eventsLib";
import {
  actorValidator,
  entityValidator,
  eventCategoryValidator,
  eventSourceValidator,
  importanceValidator,
} from "../lib/validators";
import { getWorkspaceDocByExternalId } from "../lib/workspacesLib";
import {
  generateRawWebhookSecret,
  getActiveSecretForWorkspace as getLegacyActiveSecret,
  docToWebhookSecretRecord,
} from "../lib/githubWebhookSecretsLib";
import {
  getActiveIntegrationSecret,
  getActiveIntegrationSecretForServer,
  getActiveIntegrationSecretMetadata,
  getIntegrationConnection,
  markLegacySecretPathUsed,
  recordIntegrationDelivery,
  recordIntegrationSystemEvent,
  revokeIntegrationSecret,
  saveEncryptedIntegrationSecret,
  setIntegrationConnectionError,
  updateIntegrationStatus,
} from "../lib/integrationSharedLib";
import type {
  CreateGithubWebhookSecretResult,
  GithubStatus,
  GithubWebhookSecretRecord,
} from "../../src/types/github-integration";
import { WEBHOOK_SECRET_PREFIX } from "../../src/types/github-integration";

function validateIntegrationServerKey(serverKey: string): void {
  const expected = process.env.SORTIRI_INTEGRATION_SERVER_KEY;
  if (!expected || serverKey !== expected) {
    throw new Error("Unauthorized");
  }
}

function buildCreatedBy(membership: {
  clerkUserId: string;
  email?: string;
  name?: string;
}) {
  return {
    clerkUserId: membership.clerkUserId,
    email: membership.email,
    name: membership.name,
  };
}

export const createWebhookSecret = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<CreateGithubWebhookSecretResult> => {
    await requireUserId(ctx);
    const { workspace, membership } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const rawSecret = generateRawWebhookSecret();
    const { last4, connectionId } = await saveEncryptedIntegrationSecret(ctx, {
      workspaceId: workspace._id,
      source: "github",
      connectionName: "GitHub",
      secretName: "GitHub Webhook Secret",
      rawSecret,
      createdBy: buildCreatedBy(membership),
    });

    const secretDoc = await getActiveIntegrationSecret(ctx, workspace._id, "github");

    return {
      secretId: secretDoc?._id ?? connectionId,
      rawSecret,
      last4,
    };
  },
});

/** @deprecated Use getGithubStatus instead */
export const listWebhookSecrets = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<GithubWebhookSecretRecord[]> => {
    await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const secretMeta = await getActiveIntegrationSecretMetadata(ctx, workspace._id, "github");
    if (secretMeta) {
      return [
        {
          id: secretMeta.id,
          workspaceId: workspace.externalId,
          last4: secretMeta.secretLast4,
          status: secretMeta.status,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
    }

    const legacy = await getLegacyActiveSecret(ctx, workspace._id);
    if (legacy) {
      return [docToWebhookSecretRecord(legacy)];
    }

    return [];
  },
});

export const revokeWebhookSecret = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    await revokeIntegrationSecret(ctx, {
      workspaceId: workspace._id,
      source: "github",
      connectionName: "GitHub",
    });
  },
});

export const getGithubStatus = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<GithubStatus> => {
    await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
      "viewer",
    ]);

    const connection = await getIntegrationConnection(ctx, workspace._id, "github");
    const secretMeta = await getActiveIntegrationSecretMetadata(ctx, workspace._id, "github");
    const legacySecret = secretMeta ? null : await getLegacyActiveSecret(ctx, workspace._id);

    const githubEvents = await ctx.db
      .query("events")
      .withIndex("by_source", (q) =>
        q.eq("workspaceId", workspace._id).eq("source", "github"),
      )
      .collect();

    const eventCount = Math.max(connection?.eventCount ?? 0, githubEvents.length);
    const lastEventAt =
      connection?.lastEventAt ??
      (githubEvents.length > 0
        ? githubEvents.reduce(
            (max, doc) => (doc.occurredAt > max ? doc.occurredAt : max),
            githubEvents[0]!.occurredAt,
          )
        : undefined);

    const metadata = connection?.metadata as { lastError?: string } | undefined;
    let connectionStatus = connection?.status ?? "not_connected";
    if (metadata?.lastError) {
      connectionStatus = "error";
    } else if (secretMeta && connectionStatus !== "revoked") {
      connectionStatus = "connected";
    } else if (legacySecret && connectionStatus !== "revoked") {
      connectionStatus = "connected";
    } else if (!secretMeta && !legacySecret && connectionStatus === "connected") {
      connectionStatus = "not_connected";
    }

    return {
      connectionStatus,
      maskedSecret: secretMeta?.maskedSecret,
      secretLast4: secretMeta?.secretLast4 ?? legacySecret?.last4,
      secretStatus: secretMeta?.status ?? legacySecret?.status,
      hasActiveSecret: Boolean(secretMeta) || Boolean(legacySecret),
      eventCount,
      lastEventAt,
      legacySecretDetected: Boolean(legacySecret) && !secretMeta,
      lastError: metadata?.lastError,
      connectionId: connection?._id ?? secretMeta?.connectionId,
    };
  },
});

export const getActiveSecretForServer = query({
  args: {
    workspaceExternalId: v.string(),
    serverKey: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    encryptedSecret?: string;
    legacyPlaintext?: string;
    secretPath: "encrypted" | "legacy";
  } | null> => {
    validateIntegrationServerKey(args.serverKey);

    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
    const encrypted = await getActiveIntegrationSecretForServer(ctx, workspace._id, "github");
    if (encrypted) {
      return {
        encryptedSecret: encrypted.encryptedSecret,
        secretPath: "encrypted",
      };
    }

    const legacy = await getLegacyActiveSecret(ctx, workspace._id);
    if (legacy) {
      return {
        legacyPlaintext: legacy.secret,
        secretPath: "legacy",
      };
    }

    return null;
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

    const result = await recordIntegrationDelivery(ctx, {
      workspaceId: workspace._id,
      source: "github",
      deliveryId: args.deliveryId,
      eventType: args.githubEventType,
      onRecord: async () =>
        insertEvent(ctx, {
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
        }),
    });

    if (result.duplicate) {
      return { ok: true as const, duplicate: true as const };
    }

    const occurredAt = args.occurredAt ?? Date.now();
    await updateIntegrationStatus(ctx, workspace._id, "github", occurredAt);

    return { ok: true as const, duplicate: false as const, eventId: result.eventId };
  },
});

function normalizeWebhookErrorImportance(
  importance?: "critical" | "low" | "normal" | "high",
): "normal" | "high" {
  return importance === "high" || importance === "critical" ? "high" : "normal";
}

export const markGithubLegacySecretPath = mutation({
  args: {
    serverKey: v.string(),
    workspaceExternalId: v.string(),
  },
  handler: async (ctx, args) => {
    validateIntegrationServerKey(args.serverKey);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
    await markLegacySecretPathUsed(ctx, workspace._id, "github", "GitHub");
    return { ok: true as const };
  },
});

export const recordGithubWebhookError = mutation({
  args: {
    serverKey: v.string(),
    workspaceExternalId: v.string(),
    error: v.string(),
    usedLegacySecret: v.optional(v.boolean()),
    importance: v.optional(importanceValidator),
  },
  handler: async (ctx, args) => {
    validateIntegrationServerKey(args.serverKey);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
    await setIntegrationConnectionError(
      ctx,
      workspace._id,
      "github",
      "GitHub",
      args.error,
    );
    if (args.usedLegacySecret) {
      await markLegacySecretPathUsed(ctx, workspace._id, "github", "GitHub");
    }
    await recordIntegrationSystemEvent(ctx, {
      workspaceId: workspace._id,
      type: "integration.webhook_error",
      title: "GitHub webhook error",
      summary: args.error,
      importance: normalizeWebhookErrorImportance(args.importance),
    });
    return { ok: true as const };
  },
});

export const sendTestEvent = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
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

    await updateIntegrationStatus(ctx, workspace._id, "github", Date.now());

    return { eventId };
  },
});

/** Dev/test helper — provision a webhook secret without UI auth. */
export const provisionWebhookSecretForServer = mutation({
  args: {
    serverKey: v.string(),
    workspaceExternalId: v.string(),
    secret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateIntegrationServerKey(args.serverKey);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
    const rawSecret = args.secret ?? generateRawWebhookSecret();

    if (!rawSecret.startsWith(WEBHOOK_SECRET_PREFIX)) {
      throw new Error(`GitHub webhook secret must start with ${WEBHOOK_SECRET_PREFIX}`);
    }

    const { connectionId } = await saveEncryptedIntegrationSecret(ctx, {
      workspaceId: workspace._id,
      source: "github",
      connectionName: "GitHub",
      secretName: "GitHub Webhook Secret",
      rawSecret,
    });

    const secretDoc = await getActiveIntegrationSecret(ctx, workspace._id, "github");

    return { secretId: secretDoc?._id ?? connectionId, rawSecret };
  },
});
