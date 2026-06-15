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
  severityValidator,
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
import {
  STRIPE_WEBHOOK_SECRET_PREFIX,
  type SaveStripeWebhookSecretResult,
  type StripeStatus,
} from "../../src/types/stripe-integration";

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

export const saveWebhookSecret = mutation({
  args: {
    workspaceId: v.string(),
    rawSecret: v.string(),
  },
  handler: async (ctx, args): Promise<SaveStripeWebhookSecretResult> => {
    await requireUserId(ctx);
    const { workspace, membership } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const trimmed = args.rawSecret.trim();
    if (!trimmed.startsWith(STRIPE_WEBHOOK_SECRET_PREFIX)) {
      throw new Error("Stripe webhook secret must start with whsec_");
    }

    const { last4 } = await saveEncryptedIntegrationSecret(ctx, {
      workspaceId: workspace._id,
      source: "stripe",
      connectionName: "Stripe",
      secretName: "Stripe webhook signing secret",
      rawSecret: trimmed,
      createdBy: buildCreatedBy(membership),
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "stripe",
      category: "system_event",
      type: "stripe.webhook_secret_saved",
      actor: { type: "system", name: "Stripe" },
      title: "Stripe webhook secret saved",
      summary: "The Stripe webhook signing secret was saved.",
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
      source: "stripe",
      connectionName: "Stripe",
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "stripe",
      category: "system_event",
      type: "stripe.webhook_secret_revoked",
      actor: { type: "system", name: "Stripe" },
      title: "Stripe webhook secret revoked",
      summary: "The Stripe webhook signing secret was revoked.",
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
    const secret = await getActiveIntegrationSecretForServer(ctx, workspace._id, "stripe");
    if (!secret) {
      return null;
    }

    return { encryptedSecret: secret.encryptedSecret };
  },
});

export const getStripeStatus = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<StripeStatus> => {
    await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
      "viewer",
    ]);

    const connection = await getIntegrationConnection(ctx, workspace._id, "stripe");
    const secretMeta = await getActiveIntegrationSecretMetadata(ctx, workspace._id, "stripe");

    const stripeEvents = await ctx.db
      .query("events")
      .withIndex("by_source", (q) =>
        q.eq("workspaceId", workspace._id).eq("source", "stripe"),
      )
      .collect();

    const eventCount = Math.max(connection?.eventCount ?? 0, stripeEvents.length);
    const lastEventAt =
      connection?.lastEventAt ??
      (stripeEvents.length > 0
        ? stripeEvents.reduce(
            (max, doc) => (doc.occurredAt > max ? doc.occurredAt : max),
            stripeEvents[0]!.occurredAt,
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

export const recordStripeDelivery = mutation({
  args: {
    serverKey: v.string(),
    workspaceExternalId: v.string(),
    deliveryId: v.optional(v.string()),
    stripeEventType: v.optional(v.string()),
    source: eventSourceValidator,
    category: eventCategoryValidator,
    type: v.string(),
    actor: actorValidator,
    title: v.string(),
    summary: v.optional(v.string()),
    entity: v.optional(entityValidator),
    data: v.optional(v.any()),
    occurredAt: v.optional(v.number()),
    severity: v.optional(severityValidator),
    importance: v.optional(importanceValidator),
    visibility: v.optional(visibilityValidator),
  },
  handler: async (ctx, args) => {
    validateIntegrationServerKey(args.serverKey);

    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);

    const result = await recordIntegrationDelivery(ctx, {
      workspaceId: workspace._id,
      source: "stripe",
      deliveryId: args.deliveryId,
      eventType: args.stripeEventType,
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
          severity: args.severity,
          importance: args.importance,
          visibility: args.visibility,
        }),
    });

    if (result.duplicate) {
      return { ok: true as const, duplicate: true as const };
    }

    const occurredAt = args.occurredAt ?? Date.now();
    await updateIntegrationStatus(ctx, workspace._id, "stripe", occurredAt);

    return { ok: true as const, duplicate: false as const, eventId: result.eventId };
  },
});

function normalizeWebhookErrorImportance(
  importance?: "critical" | "low" | "normal" | "high",
): "normal" | "high" {
  return importance === "high" || importance === "critical" ? "high" : "normal";
}

export const recordStripeWebhookError = mutation({
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
      "stripe",
      "Stripe",
      args.error,
    );
    await recordIntegrationSystemEvent(ctx, {
      workspaceId: workspace._id,
      type: "integration.webhook_error",
      title: "Stripe webhook error",
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
      source: "stripe",
      category: "revenue_event",
      type: "stripe.checkout.session.completed",
      actor: {
        type: "customer",
        id: "cus_test_sortiri",
        name: "test@sortiri.dev",
        email: "test@sortiri.dev",
      },
      title: "Checkout completed",
      summary: "test@sortiri.dev completed checkout for 49.00 USD.",
      entity: {
        type: "payment",
        id: "cs_test_sortiri",
        name: "Checkout cs_test_sortiri",
        url: "https://dashboard.stripe.com/test/checkout/sessions/cs_test_sortiri",
      },
      data: {
        stripeEventId: "evt_test_sortiri",
        mode: "subscription",
        amountTotal: 49,
        amountCents: 4900,
        currency: "usd",
        customerId: "cus_test_sortiri",
        customerEmail: "test@sortiri.dev",
        paymentStatus: "paid",
        subscriptionId: "sub_test_sortiri",
        paymentIntentId: "pi_test_sortiri",
        sessionId: "cs_test_sortiri",
        livemode: false,
      },
      importance: "high",
      visibility: "primary",
    });

    await updateIntegrationStatus(ctx, workspace._id, "stripe", Date.now());

    return { eventId };
  },
});

export const revokeWebhookSecretById = mutation({
  args: {
    secretId: v.id("integrationSecrets"),
  },
  handler: async (ctx, args): Promise<void> => {
    await requireUserId(ctx);
    const secret = await ctx.db.get(args.secretId);
    if (!secret || secret.source !== "stripe") {
      throw new Error("Webhook secret not found");
    }

    const workspace = await ctx.db.get(secret.workspaceId);
    if (!workspace) {
      throw new Error("Webhook secret not found");
    }

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);
    await revokeIntegrationSecret(ctx, {
      workspaceId: secret.workspaceId,
      source: "stripe",
      connectionName: "Stripe",
      secretId: args.secretId,
    });

    await insertEvent(ctx, {
      workspaceId: secret.workspaceId,
      source: "stripe",
      category: "system_event",
      type: "stripe.webhook_secret_revoked",
      actor: { type: "system", name: "Stripe" },
      title: "Stripe webhook secret revoked",
      summary: "The Stripe webhook signing secret was revoked.",
      visibility: "primary",
      importance: "normal",
    });
  },
});
