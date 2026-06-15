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
  visibilityValidator,
} from "../lib/validators";
import { getWorkspaceDocByExternalId } from "../lib/workspacesLib";
import {
  getActiveIntegrationSecretForServer,
  getActiveIntegrationSecretMetadata,
  getIntegrationConnection,
  recordIntegrationDelivery,
  recordIntegrationSystemEvent,
  revokeIntegrationSecret,
  saveEncryptedIntegrationSecret,
  setIntegrationConnectionError,
  updateIntegrationStatus,
} from "../lib/integrationSharedLib";
import { generatePostHogWebhookSecret } from "../lib/posthogSecretsLib";
import { resolvePostHogProjectId } from "../lib/posthogProjectLink";
import {
  MIN_POSTHOG_SECRET_LENGTH,
  POSTHOG_WEBHOOK_SECRET_PREFIX,
  type CreatePostHogWebhookSecretResult,
  type PostHogStatus,
  type SavePostHogWebhookSecretResult,
} from "../../src/types/posthog-integration";

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
  handler: async (ctx, args): Promise<CreatePostHogWebhookSecretResult> => {
    await requireUserId(ctx);
    const { workspace, membership } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const rawSecret = generatePostHogWebhookSecret();
    const { last4 } = await saveEncryptedIntegrationSecret(ctx, {
      workspaceId: workspace._id,
      source: "posthog",
      connectionName: "PostHog",
      secretName: "PostHog webhook secret",
      rawSecret,
      createdBy: buildCreatedBy(membership),
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "posthog",
      category: "system_event",
      type: "integration.secret_created",
      actor: { type: "system", name: "PostHog" },
      title: "PostHog webhook secret created",
      summary: "A PostHog webhook secret was created.",
      visibility: "primary",
      importance: "normal",
    });

    return { rawSecret, last4 };
  },
});

export const saveWebhookSecret = mutation({
  args: {
    workspaceId: v.string(),
    rawSecret: v.string(),
  },
  handler: async (ctx, args): Promise<SavePostHogWebhookSecretResult> => {
    await requireUserId(ctx);
    const { workspace, membership } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const trimmed = args.rawSecret.trim();
    if (trimmed.length < MIN_POSTHOG_SECRET_LENGTH) {
      throw new Error(`PostHog webhook secret must be at least ${MIN_POSTHOG_SECRET_LENGTH} characters`);
    }
    if (!trimmed.startsWith(POSTHOG_WEBHOOK_SECRET_PREFIX)) {
      throw new Error(`PostHog webhook secret must start with ${POSTHOG_WEBHOOK_SECRET_PREFIX}`);
    }

    const { last4 } = await saveEncryptedIntegrationSecret(ctx, {
      workspaceId: workspace._id,
      source: "posthog",
      connectionName: "PostHog",
      secretName: "PostHog webhook secret",
      rawSecret: trimmed,
      createdBy: buildCreatedBy(membership),
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "posthog",
      category: "system_event",
      type: "integration.secret_saved",
      actor: { type: "system", name: "PostHog" },
      title: "PostHog webhook secret saved",
      summary: "The PostHog webhook secret was saved.",
      visibility: "primary",
      importance: "normal",
    });

    return { ok: true, last4 };
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
      source: "posthog",
      connectionName: "PostHog",
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "posthog",
      category: "system_event",
      type: "integration.secret_revoked",
      actor: { type: "system", name: "PostHog" },
      title: "PostHog webhook secret revoked",
      summary: "The PostHog webhook secret was revoked.",
      visibility: "primary",
      importance: "normal",
    });
  },
});

export const getWebhookSecretForVerification = query({
  args: {
    workspaceExternalId: v.string(),
    serverKey: v.string(),
  },
  handler: async (ctx, args): Promise<{ encryptedSecret: string } | null> => {
    validateIntegrationServerKey(args.serverKey);

    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
    const secret = await getActiveIntegrationSecretForServer(ctx, workspace._id, "posthog");
    if (!secret) {
      return null;
    }

    return { encryptedSecret: secret.encryptedSecret };
  },
});

export const getPostHogStatus = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<PostHogStatus> => {
    await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
      "viewer",
    ]);

    const connection = await getIntegrationConnection(ctx, workspace._id, "posthog");
    const secretMeta = await getActiveIntegrationSecretMetadata(ctx, workspace._id, "posthog");

    const posthogEvents = await ctx.db
      .query("events")
      .withIndex("by_source", (q) =>
        q.eq("workspaceId", workspace._id).eq("source", "posthog"),
      )
      .collect();

    const eventCount = Math.max(connection?.eventCount ?? 0, posthogEvents.length);
    const lastEventAt =
      connection?.lastEventAt ??
      (posthogEvents.length > 0
        ? posthogEvents.reduce(
            (max, doc) => (doc.occurredAt > max ? doc.occurredAt : max),
            posthogEvents[0]!.occurredAt,
          )
        : undefined);

    const metadata = connection?.metadata as { lastError?: string } | undefined;
    let connectionStatus = connection?.status ?? "not_connected";
    if (metadata?.lastError) {
      connectionStatus = "error";
    } else if (secretMeta && connectionStatus !== "revoked") {
      connectionStatus = "connected";
    } else if (!secretMeta && connectionStatus === "connected") {
      connectionStatus = "not_connected";
    }

    return {
      connectionStatus,
      maskedSecret: secretMeta?.maskedSecret,
      secretLast4: secretMeta?.secretLast4,
      secretStatus: secretMeta?.status,
      eventCount,
      lastEventAt,
      lastError: metadata?.lastError,
    };
  },
});

export const recordPostHogDelivery = mutation({
  args: {
    serverKey: v.string(),
    workspaceExternalId: v.string(),
    deliveryId: v.string(),
    posthogEventName: v.string(),
    source: eventSourceValidator,
    category: eventCategoryValidator,
    type: v.string(),
    actor: actorValidator,
    title: v.string(),
    summary: v.optional(v.string()),
    entity: v.optional(entityValidator),
    data: v.optional(v.any()),
    occurredAt: v.optional(v.number()),
    importance: v.optional(importanceValidator),
    visibility: v.optional(visibilityValidator),
  },
  handler: async (ctx, args) => {
    validateIntegrationServerKey(args.serverKey);

    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
    const data =
      args.data && typeof args.data === "object" && !Array.isArray(args.data)
        ? (args.data as Record<string, unknown>)
        : {};
    const projectId = await resolvePostHogProjectId(ctx, workspace._id, data);

    const result = await recordIntegrationDelivery(ctx, {
      workspaceId: workspace._id,
      source: "posthog",
      deliveryId: args.deliveryId,
      eventType: args.posthogEventName,
      onRecord: async () =>
        insertEvent(ctx, {
          workspaceId: workspace._id,
          projectId,
          source: args.source,
          category: args.category,
          type: args.type,
          actor: args.actor,
          title: args.title,
          summary: args.summary,
          entity: args.entity,
          data: args.data,
          occurredAt: args.occurredAt,
          importance: args.importance,
          visibility: args.visibility,
        }),
    });

    if (result.duplicate) {
      return { ok: true as const, duplicate: true as const };
    }

    const occurredAt = args.occurredAt ?? Date.now();
    await updateIntegrationStatus(ctx, workspace._id, "posthog", occurredAt);

    return { ok: true as const, duplicate: false as const, eventId: result.eventId };
  },
});

function normalizeWebhookErrorImportance(
  importance?: "critical" | "low" | "normal" | "high",
): "normal" | "high" {
  return importance === "high" || importance === "critical" ? "high" : "normal";
}

export const recordPosthogWebhookError = mutation({
  args: {
    serverKey: v.string(),
    workspaceExternalId: v.string(),
    error: v.string(),
    importance: v.optional(importanceValidator),
  },
  handler: async (ctx, args) => {
    validateIntegrationServerKey(args.serverKey);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
    await setIntegrationConnectionError(
      ctx,
      workspace._id,
      "posthog",
      "PostHog",
      args.error,
    );
    await recordIntegrationSystemEvent(ctx, {
      workspaceId: workspace._id,
      type: "integration.webhook_error",
      title: "PostHog webhook error",
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
      source: "posthog",
      category: "product_event",
      type: "posthog.user.signed_up",
      actor: {
        type: "human",
        id: "user_test_sortiri",
        name: "test@sortiri.dev",
        email: "test@sortiri.dev",
      },
      title: "User signed up",
      summary: "test@sortiri.dev signed up via PostHog.",
      entity: {
        type: "user",
        id: "user_test_sortiri",
        name: "test@sortiri.dev",
      },
      data: {
        email: "test@sortiri.dev",
        distinctId: "user_test_sortiri",
        posthogEventName: "user signed up",
        deliveryId: "posthog:test_sortiri",
      },
      importance: "high",
      visibility: "primary",
    });

    await updateIntegrationStatus(ctx, workspace._id, "posthog", Date.now());

    return { eventId };
  },
});
