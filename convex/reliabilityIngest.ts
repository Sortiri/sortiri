import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  resolveReliabilityWorkspace,
} from "./lib/reliabilityIngestAuth";
import {
  assertNotAuditorWorkspaceBrowse,
  getCurrentUser,
  requireWorkspaceRole,
} from "./lib/authz";
import { assertWorkspaceBrowseAccess } from "./lib/eventsLib";
import {
  createIngestDelivery,
  docToIngestDeliverySummary,
  findDeliveryById,
  findDeliveryByIdempotencyKey,
  listDeliveriesForWorkspace,
  MAX_INGEST_RETRY_ATTEMPTS,
  updateIngestDelivery,
} from "./lib/ingestDeliveryLib";
import {
  createDeadLetter,
  docToDeadLetterSummary,
  findDeadLetterById,
  listDeadLettersForWorkspace,
  updateDeadLetterStatus,
} from "./lib/ingestDeadLetterLib";
import { markDeliveryProcessed } from "./lib/integrationDeliveriesLib";
import { updateIntegrationStatus } from "./lib/integrationSharedLib";
import {
  aggregateDeliveryHealth,
  recordIngestDeliveryTimelineEvent,
  writeEventFromEnvelopePayload,
} from "./lib/ingestReliabilityLib";
import { listJournalEntries, readJournalEntry } from "./lib/ingestJournalLib";

const ingestAuthArgs = {
  ingestKey: v.optional(v.string()),
  apiKeyId: v.optional(v.id("apiKeys")),
  workspaceId: v.optional(v.string()),
  serverKey: v.optional(v.string()),
  workspaceExternalId: v.optional(v.string()),
};

async function resolveWorkspace(ctx: Parameters<typeof resolveReliabilityWorkspace>[0], args: {
  ingestKey?: string;
  apiKeyId?: Id<"apiKeys">;
  workspaceId?: string;
  serverKey?: string;
  workspaceExternalId?: string;
}) {
  return resolveReliabilityWorkspace(ctx, args);
}

const deliveryStatusValidator = v.union(
  v.literal("received"),
  v.literal("journaled"),
  v.literal("convex_written"),
  v.literal("retry_pending"),
  v.literal("dead_lettered"),
  v.literal("replayed"),
  v.literal("duplicate"),
);

export const checkIdempotency = query({
  args: {
    ...ingestAuthArgs,
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    const existing = await findDeliveryByIdempotencyKey(ctx, args.idempotencyKey);
    if (!existing || existing.workspaceId !== workspace._id) {
      return { duplicate: false as const };
    }
    return {
      duplicate: true as const,
      deliveryId: existing._id,
      eventId: existing.eventId,
      status: existing.status,
    };
  },
});

export const registerJournaledDelivery = mutation({
  args: {
    ...ingestAuthArgs,
    envelopeId: v.string(),
    idempotencyKey: v.string(),
    source: v.string(),
    sourceEventId: v.string(),
    projectId: v.optional(v.id("projects")),
    journalRef: v.string(),
    redacted: v.optional(v.boolean()),
    sensitiveFindings: v.optional(v.array(v.string())),
    receivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    const existing = await findDeliveryByIdempotencyKey(ctx, args.idempotencyKey);
    if (existing) {
      return {
        duplicate: true as const,
        deliveryId: existing._id,
        eventId: existing.eventId,
        status: existing.status,
      };
    }

    const deliveryId = await createIngestDelivery(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      envelopeId: args.envelopeId,
      idempotencyKey: args.idempotencyKey,
      source: args.source,
      sourceEventId: args.sourceEventId,
      status: "journaled",
      journalRef: args.journalRef,
      redacted: args.redacted,
      sensitiveFindings: args.sensitiveFindings,
      receivedAt: args.receivedAt,
    });

    await recordIngestDeliveryTimelineEvent(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      type: "ingest.delivery_journaled",
      title: `Journaled ${args.source} delivery`,
      summary: `sourceEventId=${args.sourceEventId}`,
      source: args.source,
      deliveryStatus: "journaled",
    });

    return { duplicate: false as const, deliveryId };
  },
});

export const completeDeliveryWrite = mutation({
  args: {
    ...ingestAuthArgs,
    deliveryId: v.id("ingestDeliveries"),
    payload: v.any(),
    replayed: v.optional(v.boolean()),
    integrationSource: v.optional(v.string()),
    integrationDeliveryId: v.optional(v.string()),
    integrationEventType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    const delivery = await findDeliveryById(ctx, args.deliveryId);
    if (!delivery || delivery.workspaceId !== workspace._id) {
      throw new Error("Delivery not found");
    }
    if (delivery.eventId) {
      return {
        eventId: delivery.eventId,
        status: delivery.status,
        duplicate: true as const,
      };
    }

    const eventId = await writeEventFromEnvelopePayload(
      ctx,
      workspace._id,
      args.payload,
    );
    const status = args.replayed ? ("replayed" as const) : ("convex_written" as const);
    await updateIngestDelivery(ctx, delivery._id, {
      status,
      eventId,
      attempts: delivery.attempts + 1,
      lastAttemptAt: Date.now(),
      lastError: undefined,
    });

    if (args.integrationSource && args.integrationDeliveryId) {
      await markDeliveryProcessed(ctx, {
        workspaceId: workspace._id,
        source: args.integrationSource,
        deliveryId: args.integrationDeliveryId,
        eventType: args.integrationEventType,
      });
      if (
        args.integrationSource === "github" ||
        args.integrationSource === "stripe" ||
        args.integrationSource === "posthog" ||
        args.integrationSource === "slack" ||
        args.integrationSource === "observability"
      ) {
        await updateIntegrationStatus(
          ctx,
          workspace._id,
          args.integrationSource,
          Date.now(),
        );
      }
    }

    await recordIngestDeliveryTimelineEvent(ctx, {
      workspaceId: workspace._id,
      projectId: delivery.projectId,
      type: args.replayed ? "ingest.delivery_replayed" : "ingest.delivery_written",
      title: args.replayed
        ? `Replayed ${delivery.source} delivery`
        : `Wrote ${delivery.source} delivery to timeline`,
      summary: `sourceEventId=${delivery.sourceEventId}`,
      source: delivery.source,
      deliveryStatus: status,
    });

    return { eventId, status, duplicate: false as const };
  },
});

export const markDeliveryRetryPending = mutation({
  args: {
    ...ingestAuthArgs,
    deliveryId: v.id("ingestDeliveries"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    const delivery = await findDeliveryById(ctx, args.deliveryId);
    if (!delivery || delivery.workspaceId !== workspace._id) {
      throw new Error("Delivery not found");
    }

    const attempts = delivery.attempts + 1;
    if (attempts >= MAX_INGEST_RETRY_ATTEMPTS) {
      await updateIngestDelivery(ctx, delivery._id, {
        status: "dead_lettered",
        attempts,
        lastAttemptAt: Date.now(),
        lastError: args.error,
      });
      const deadLetterId = await createDeadLetter(ctx, {
        workspaceId: workspace._id,
        projectId: delivery.projectId,
        envelopeId: delivery.envelopeId,
        idempotencyKey: delivery.idempotencyKey,
        source: delivery.source,
        sourceEventId: delivery.sourceEventId,
        journalRef: delivery.journalRef,
        deliveryId: delivery._id,
        reason: "max_retries_exceeded",
        error: args.error,
        attempts,
        redacted: delivery.redacted,
        sensitiveFindings: delivery.sensitiveFindings,
      });
      await recordIngestDeliveryTimelineEvent(ctx, {
        workspaceId: workspace._id,
        projectId: delivery.projectId,
        type: "ingest.delivery_dead_lettered",
        title: `Dead-lettered ${delivery.source} delivery`,
        summary: args.error,
        source: delivery.source,
        deliveryStatus: "dead_lettered",
      });
      return { status: "dead_lettered" as const, deadLetterId, attempts };
    }

    await updateIngestDelivery(ctx, delivery._id, {
      status: "retry_pending",
      attempts,
      lastAttemptAt: Date.now(),
      lastError: args.error,
    });
    await recordIngestDeliveryTimelineEvent(ctx, {
      workspaceId: workspace._id,
      projectId: delivery.projectId,
      type: "ingest.delivery_retry_pending",
      title: `Retry pending for ${delivery.source}`,
      summary: args.error,
      source: delivery.source,
      deliveryStatus: "retry_pending",
    });
    return { status: "retry_pending" as const, attempts };
  },
});

export const markDeliveryDuplicate = mutation({
  args: {
    ...ingestAuthArgs,
    deliveryId: v.id("ingestDeliveries"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    const delivery = await findDeliveryById(ctx, args.deliveryId);
    if (!delivery || delivery.workspaceId !== workspace._id) {
      throw new Error("Delivery not found");
    }
    await updateIngestDelivery(ctx, delivery._id, { status: "duplicate" });
    await recordIngestDeliveryTimelineEvent(ctx, {
      workspaceId: workspace._id,
      projectId: delivery.projectId,
      type: "ingest.delivery_duplicate",
      title: `Duplicate ${delivery.source} delivery`,
      source: delivery.source,
      deliveryStatus: "duplicate",
    });
    return { status: "duplicate" as const };
  },
});

export const createDeadLetterDirect = mutation({
  args: {
    ...ingestAuthArgs,
    envelopeId: v.string(),
    idempotencyKey: v.string(),
    source: v.string(),
    sourceEventId: v.string(),
    projectId: v.optional(v.id("projects")),
    journalRef: v.optional(v.string()),
    deliveryId: v.optional(v.id("ingestDeliveries")),
    reason: v.string(),
    error: v.optional(v.string()),
    payloadPreview: v.optional(v.string()),
    sensitiveFindings: v.optional(v.array(v.string())),
    redacted: v.optional(v.boolean()),
    attempts: v.number(),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    if (args.deliveryId) {
      await updateIngestDelivery(ctx, args.deliveryId, {
        status: "dead_lettered",
        lastError: args.error,
      });
    }
    const deadLetterId = await createDeadLetter(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      envelopeId: args.envelopeId,
      idempotencyKey: args.idempotencyKey,
      source: args.source,
      sourceEventId: args.sourceEventId,
      journalRef: args.journalRef,
      deliveryId: args.deliveryId,
      reason: args.reason,
      error: args.error,
      payloadPreview: args.payloadPreview,
      sensitiveFindings: args.sensitiveFindings,
      redacted: args.redacted,
      attempts: args.attempts,
    });
    await recordIngestDeliveryTimelineEvent(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      type: "ingest.delivery_dead_lettered",
      title: `Dead-lettered ${args.source} delivery`,
      summary: args.reason,
      source: args.source,
      deliveryStatus: "dead_lettered",
    });
    return { deadLetterId };
  },
});

export const listDeliveriesForIngest = query({
  args: {
    ...ingestAuthArgs,
    status: v.optional(deliveryStatusValidator),
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    const rows = await listDeliveriesForWorkspace(ctx, workspace._id, {
      status: args.status,
      source: args.source,
      limit: args.limit,
    });
    return rows.map(docToIngestDeliverySummary);
  },
});

export const getDeliveryForIngest = query({
  args: {
    ...ingestAuthArgs,
    deliveryId: v.id("ingestDeliveries"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    const doc = await findDeliveryById(ctx, args.deliveryId);
    if (!doc || doc.workspaceId !== workspace._id) return null;
    return docToIngestDeliverySummary(doc);
  },
});

export const listDeadLettersForIngest = query({
  args: {
    ...ingestAuthArgs,
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("replayed"),
        v.literal("ignored"),
        v.literal("archived"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    const rows = await listDeadLettersForWorkspace(ctx, workspace._id, {
      status: args.status,
      limit: args.limit,
    });
    return rows.map(docToDeadLetterSummary);
  },
});

export const getDeadLetterForIngest = query({
  args: {
    ...ingestAuthArgs,
    deadLetterId: v.id("ingestDeadLetters"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    const doc = await findDeadLetterById(ctx, args.deadLetterId);
    if (!doc || doc.workspaceId !== workspace._id) return null;
    return docToDeadLetterSummary(doc);
  },
});

export const getDeliveryHealthForIngest = query({
  args: ingestAuthArgs,
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
    const deliveries = await listDeliveriesForWorkspace(ctx, workspace._id, {
      limit: 500,
    });
    const deadLetters = await listDeadLettersForWorkspace(ctx, workspace._id, {
      status: "open",
      limit: 500,
    });
    const deadLetterCountBySource: Record<string, number> = {};
    for (const dl of deadLetters) {
      deadLetterCountBySource[dl.source] =
        (deadLetterCountBySource[dl.source] ?? 0) + 1;
    }
    return aggregateDeliveryHealth(
      deliveries.map((d) => ({
        source: d.source,
        status: d.status,
        receivedAt: d.receivedAt,
        updatedAt: d.updatedAt,
      })),
      deadLetterCountBySource,
      sinceMs,
    );
  },
});

export const listJournalEntriesForIngest = query({
  args: {
    ...ingestAuthArgs,
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    const entries = await listJournalEntries(ctx, workspace._id, args.limit ?? 50);
    const filtered = args.source
      ? entries.filter((entry) => entry.source === args.source)
      : entries;
    return filtered.map((entry) => ({
      journalRef: entry.journalRef,
      envelopeId: entry.envelopeId,
      source: entry.source,
      sourceEventId: entry.sourceEventId,
      receivedAt: entry.receivedAt,
    }));
  },
});

export const replayDeliveryForIngest = mutation({
  args: {
    ...ingestAuthArgs,
    deliveryId: v.id("ingestDeliveries"),
    payload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspace(ctx, args);
    const delivery = await findDeliveryById(ctx, args.deliveryId);
    if (!delivery || delivery.workspaceId !== workspace._id) {
      throw new Error("Delivery not found");
    }
    if (delivery.eventId) {
      return {
        eventId: delivery.eventId,
        status: delivery.status,
        duplicate: true as const,
      };
    }
    let payload = args.payload;
    if (payload === undefined) {
      if (!delivery.journalRef) {
        throw new Error("No journal ref available for replay");
      }
      const envelope = await readJournalEntry(ctx, delivery.journalRef);
      payload = envelope.payload;
    }
    const eventId = await writeEventFromEnvelopePayload(
      ctx,
      workspace._id,
      payload,
    );
    await updateIngestDelivery(ctx, delivery._id, {
      status: "replayed",
      eventId,
      attempts: delivery.attempts + 1,
      lastAttemptAt: Date.now(),
    });
    return { eventId, status: "replayed" as const, duplicate: false as const };
  },
});

export const listDeliveries = query({
  args: {
    workspaceId: v.string(),
    status: v.optional(deliveryStatusValidator),
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    const rows = await listDeliveriesForWorkspace(ctx, workspace._id, {
      status: args.status,
      source: args.source,
      limit: args.limit,
    });
    return rows.map(docToIngestDeliverySummary);
  },
});

export const getDelivery = query({
  args: {
    workspaceId: v.string(),
    deliveryId: v.id("ingestDeliveries"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    const doc = await findDeliveryById(ctx, args.deliveryId);
    if (!doc || doc.workspaceId !== workspace._id) return null;
    return docToIngestDeliverySummary(doc);
  },
});

export const listDeadLetters = query({
  args: {
    workspaceId: v.string(),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("replayed"),
        v.literal("ignored"),
        v.literal("archived"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    const rows = await listDeadLettersForWorkspace(ctx, workspace._id, {
      status: args.status,
      limit: args.limit,
    });
    return rows.map(docToDeadLetterSummary);
  },
});

export const getDeadLetter = query({
  args: {
    workspaceId: v.string(),
    deadLetterId: v.id("ingestDeadLetters"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    const doc = await findDeadLetterById(ctx, args.deadLetterId);
    if (!doc || doc.workspaceId !== workspace._id) return null;
    return docToDeadLetterSummary(doc);
  },
});

export const replayDelivery = mutation({
  args: {
    workspaceId: v.string(),
    deliveryId: v.id("ingestDeliveries"),
    payload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin"]);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );

    const delivery = await findDeliveryById(ctx, args.deliveryId);
    if (!delivery || delivery.workspaceId !== workspace._id) {
      throw new Error("Delivery not found");
    }
    if (delivery.eventId) {
      return {
        eventId: delivery.eventId,
        status: delivery.status,
        duplicate: true as const,
      };
    }

    let payload = args.payload;
    if (payload === undefined) {
      if (!delivery.journalRef) {
        throw new Error("No journal ref available for replay");
      }
      const envelope = await readJournalEntry(ctx, delivery.journalRef);
      payload = envelope.payload;
    }

    const eventId = await writeEventFromEnvelopePayload(
      ctx,
      workspace._id,
      payload,
    );
    await updateIngestDelivery(ctx, delivery._id, {
      status: "replayed",
      eventId,
      attempts: delivery.attempts + 1,
      lastAttemptAt: Date.now(),
    });
    await recordIngestDeliveryTimelineEvent(ctx, {
      workspaceId: workspace._id,
      projectId: delivery.projectId,
      type: "ingest.delivery_replayed",
      title: `Replayed ${delivery.source} delivery`,
      source: delivery.source,
      deliveryStatus: "replayed",
    });
    return { eventId, status: "replayed" as const, duplicate: false as const };
  },
});

export const ignoreDeadLetter = mutation({
  args: {
    workspaceId: v.string(),
    deadLetterId: v.id("ingestDeadLetters"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin"]);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    const doc = await findDeadLetterById(ctx, args.deadLetterId);
    if (!doc || doc.workspaceId !== workspace._id) {
      throw new Error("Dead letter not found");
    }
    await updateDeadLetterStatus(ctx, args.deadLetterId, "ignored");
    return { status: "ignored" as const };
  },
});

export const archiveDeadLetter = mutation({
  args: {
    workspaceId: v.string(),
    deadLetterId: v.id("ingestDeadLetters"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin"]);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    const doc = await findDeadLetterById(ctx, args.deadLetterId);
    if (!doc || doc.workspaceId !== workspace._id) {
      throw new Error("Dead letter not found");
    }
    await updateDeadLetterStatus(ctx, args.deadLetterId, "archived");
    return { status: "archived" as const };
  },
});

export const getDeliveryHealthSummary = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );

    const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
    const deliveries = await listDeliveriesForWorkspace(ctx, workspace._id, {
      limit: 500,
    });
    const deadLetters = await listDeadLettersForWorkspace(ctx, workspace._id, {
      status: "open",
      limit: 500,
    });
    const deadLetterCountBySource: Record<string, number> = {};
    for (const dl of deadLetters) {
      deadLetterCountBySource[dl.source] =
        (deadLetterCountBySource[dl.source] ?? 0) + 1;
    }

    return aggregateDeliveryHealth(
      deliveries.map((d) => ({
        source: d.source,
        status: d.status,
        receivedAt: d.receivedAt,
        updatedAt: d.updatedAt,
      })),
      deadLetterCountBySource,
      sinceMs,
    );
  },
});

export const assertCanReplay = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { membership } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);
    assertNotAuditorWorkspaceBrowse(membership);
    await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    return { allowed: true as const };
  },
});
