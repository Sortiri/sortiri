import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  createIngestDelivery,
  findDeliveryByIdempotencyKey,
  MAX_INGEST_RETRY_ATTEMPTS,
  updateIngestDelivery,
} from "./ingestDeliveryLib";
import {
  createDeadLetter,
} from "./ingestDeadLetterLib";
import {
  buildEnvelope,
  buildIdempotencyKey,
  normalizeIngestPayload,
  truncatePayloadPreview,
  type NormalizedIngestEvent,
} from "./ingestEnvelope";
import { writeJournalEntry, readJournalEntry } from "./ingestJournalLib";
import {
  recordIngestDeliveryTimelineEvent,
  writeEventFromEnvelopePayload,
} from "./ingestReliabilityLib";
import { resolveReliabilityWorkspace, type ReliabilityWorkspaceArgs } from "./reliabilityIngestAuth";
import { markDeliveryProcessed } from "./integrationDeliveriesLib";
import { updateIntegrationStatus } from "./integrationSharedLib";
import { getWorkspaceDocByExternalId } from "./workspacesLib";

export type FailureInjection = {
  failJournalWrite?: boolean;
  failConvexWrite?: boolean;
  forceDeadLetter?: boolean;
};

export type RunIngestPipelineArgs = ReliabilityWorkspaceArgs & {
  body: Record<string, unknown> & { sourceEventId?: string };
  route?: string;
  apiKeyIdForMetadata?: Id<"apiKeys">;
  integration?: {
    source: string;
    deliveryId: string;
    eventType?: string;
  };
  injection?: FailureInjection;
};

export type IngestPipelineResult = {
  ok: true;
  duplicate: boolean;
  eventId?: Id<"events">;
  deliveryId: Id<"ingestDeliveries">;
  status: string;
  journalRef?: string;
};

async function markApiKeyUsedIfNeeded(
  ctx: MutationCtx,
  apiKeyId?: Id<"apiKeys">,
): Promise<void> {
  if (!apiKeyId) return;
  const key = await ctx.db.get(apiKeyId);
  if (!key) return;
  await ctx.db.patch(apiKeyId, { lastUsedAt: Date.now() });
}

export async function runIngestPipelineInConvex(
  ctx: MutationCtx,
  args: RunIngestPipelineArgs,
): Promise<IngestPipelineResult> {
  const workspace = await resolveReliabilityWorkspace(ctx, args);
  const workspaceExternalId = workspace.externalId;
  const normalized = normalizeIngestPayload(workspaceExternalId, args.body);
  const idempotencyKey = buildIdempotencyKey(
    workspaceExternalId,
    normalized.source,
    normalized.sourceEventId,
  );

  const existing = await findDeliveryByIdempotencyKey(ctx, idempotencyKey);
  if (existing && existing.workspaceId === workspace._id) {
    return {
      ok: true,
      duplicate: true,
      eventId: existing.eventId,
      deliveryId: existing._id,
      status: existing.status,
      journalRef: existing.journalRef,
    };
  }

  const injection = args.injection ?? {};

  if (injection.forceDeadLetter) {
    const envelope = buildEnvelope({
      workspaceId: workspaceExternalId,
      projectId: normalized.projectId,
      source: normalized.source,
      sourceEventId: normalized.sourceEventId,
      payload: normalized,
      metadata: {
        route: args.route,
        apiKeyId: args.apiKeyIdForMetadata,
      },
    });
    await createDeadLetter(ctx, {
      workspaceId: workspace._id,
      projectId: normalized.projectId as Id<"projects"> | undefined,
      envelopeId: envelope.envelopeId,
      idempotencyKey,
      source: normalized.source,
      sourceEventId: normalized.sourceEventId,
      reason: "forced_dead_letter",
      error: "Test forced dead letter",
      payloadPreview: truncatePayloadPreview(envelope.payload),
      sensitiveFindings: envelope.redaction.findings,
      redacted: envelope.redaction.redacted,
      attempts: 1,
    });
    throw new Error("Forced dead letter");
  }

  const envelope = buildEnvelope({
    workspaceId: workspaceExternalId,
    projectId: normalized.projectId,
    source: normalized.source,
    sourceEventId: normalized.sourceEventId,
    payload: normalized,
    metadata: {
      route: args.route,
      apiKeyId: args.apiKeyIdForMetadata,
    },
  });

  if (injection.failJournalWrite) {
    throw new Error("Simulated journal write failure");
  }

  const { journalRef } = await writeJournalEntry(ctx, workspace._id, envelope);

  const dupAfterJournal = await findDeliveryByIdempotencyKey(ctx, idempotencyKey);
  if (dupAfterJournal && dupAfterJournal.workspaceId === workspace._id) {
    return {
      ok: true,
      duplicate: true,
      eventId: dupAfterJournal.eventId,
      deliveryId: dupAfterJournal._id,
      status: dupAfterJournal.status,
      journalRef,
    };
  }

  const deliveryId = await createIngestDelivery(ctx, {
    workspaceId: workspace._id,
    projectId: normalized.projectId as Id<"projects"> | undefined,
    envelopeId: envelope.envelopeId,
    idempotencyKey,
    source: normalized.source,
    sourceEventId: normalized.sourceEventId,
    status: "journaled",
    journalRef,
    redacted: envelope.redaction.redacted,
    sensitiveFindings: envelope.redaction.findings,
    receivedAt: envelope.receivedAt,
  });

  await recordIngestDeliveryTimelineEvent(ctx, {
    workspaceId: workspace._id,
    projectId: normalized.projectId as Id<"projects"> | undefined,
    type: "ingest.delivery_journaled",
    title: `Journaled ${normalized.source} delivery`,
    summary: `sourceEventId=${normalized.sourceEventId}`,
    source: normalized.source,
    deliveryStatus: "journaled",
  });

  if (injection.failConvexWrite) {
    await updateIngestDelivery(ctx, deliveryId, {
      status: "retry_pending",
      attempts: 1,
      lastAttemptAt: Date.now(),
      lastError: "Simulated Convex write failure",
    });
    await markApiKeyUsedIfNeeded(ctx, args.apiKeyIdForMetadata);
    return {
      ok: true,
      duplicate: false,
      deliveryId,
      status: "retry_pending",
      journalRef,
    };
  }

  try {
    const written = await completeDeliveryWriteInternal(ctx, {
      workspaceId: workspace._id,
      deliveryId,
      payload: envelope.payload,
      replayed: false,
      integration: args.integration,
    });
    await markApiKeyUsedIfNeeded(ctx, args.apiKeyIdForMetadata);
    return {
      ok: true,
      duplicate: written.duplicate,
      eventId: written.eventId,
      deliveryId,
      status: written.status,
      journalRef,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Convex write failed";
    const retry = await markDeliveryRetryPendingInternal(ctx, workspace._id, deliveryId, message);
    await markApiKeyUsedIfNeeded(ctx, args.apiKeyIdForMetadata);
    return {
      ok: true,
      duplicate: false,
      deliveryId,
      status: retry.status,
      journalRef,
    };
  }
}

export async function completeDeliveryWriteInternal(
  ctx: MutationCtx,
  input: {
    workspaceId: Id<"workspaces">;
    deliveryId: Id<"ingestDeliveries">;
    payload: unknown;
    replayed: boolean;
    integration?: {
      source: string;
      deliveryId: string;
      eventType?: string;
    };
  },
): Promise<{ eventId: Id<"events">; status: string; duplicate: boolean }> {
  const delivery = await ctx.db.get(input.deliveryId);
  if (!delivery || delivery.workspaceId !== input.workspaceId) {
    throw new Error("Delivery not found");
  }
  if (delivery.eventId) {
    return {
      eventId: delivery.eventId,
      status: delivery.status,
      duplicate: true,
    };
  }

  const eventId = await writeEventFromEnvelopePayload(
    ctx,
    input.workspaceId,
    input.payload,
  );
  const status = input.replayed ? ("replayed" as const) : ("convex_written" as const);
  await updateIngestDelivery(ctx, delivery._id, {
    status,
    eventId,
    attempts: delivery.attempts + 1,
    lastAttemptAt: Date.now(),
    lastError: undefined,
  });

  if (input.integration) {
    await markDeliveryProcessed(ctx, {
      workspaceId: input.workspaceId,
      source: input.integration.source,
      deliveryId: input.integration.deliveryId,
      eventType: input.integration.eventType,
    });
    if (
      input.integration.source === "github" ||
      input.integration.source === "stripe" ||
      input.integration.source === "posthog" ||
      input.integration.source === "slack" ||
      input.integration.source === "observability"
    ) {
      await updateIntegrationStatus(
        ctx,
        input.workspaceId,
        input.integration.source,
        Date.now(),
      );
    }
  }

  await recordIngestDeliveryTimelineEvent(ctx, {
    workspaceId: input.workspaceId,
    projectId: delivery.projectId,
    type: input.replayed ? "ingest.delivery_replayed" : "ingest.delivery_written",
    title: input.replayed
      ? `Replayed ${delivery.source} delivery`
      : `Wrote ${delivery.source} delivery to timeline`,
    summary: `sourceEventId=${delivery.sourceEventId}`,
    source: delivery.source,
    deliveryStatus: status,
  });

  return { eventId, status, duplicate: false };
}

export async function markDeliveryRetryPendingInternal(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  deliveryId: Id<"ingestDeliveries">,
  error: string,
): Promise<{ status: string }> {
  const delivery = await ctx.db.get(deliveryId);
  if (!delivery || delivery.workspaceId !== workspaceId) {
    throw new Error("Delivery not found");
  }

  const attempts = delivery.attempts + 1;
  if (attempts >= MAX_INGEST_RETRY_ATTEMPTS) {
    await updateIngestDelivery(ctx, delivery._id, {
      status: "dead_lettered",
      attempts,
      lastAttemptAt: Date.now(),
      lastError: error,
    });
    await createDeadLetter(ctx, {
      workspaceId,
      projectId: delivery.projectId,
      envelopeId: delivery.envelopeId,
      idempotencyKey: delivery.idempotencyKey,
      source: delivery.source,
      sourceEventId: delivery.sourceEventId,
      journalRef: delivery.journalRef,
      deliveryId: delivery._id,
      reason: "max_retries_exceeded",
      error,
      attempts,
      redacted: delivery.redacted,
      sensitiveFindings: delivery.sensitiveFindings,
    });
    await recordIngestDeliveryTimelineEvent(ctx, {
      workspaceId,
      projectId: delivery.projectId,
      type: "ingest.delivery_dead_lettered",
      title: `Dead-lettered ${delivery.source} delivery`,
      summary: error,
      source: delivery.source,
      deliveryStatus: "dead_lettered",
    });
    return { status: "dead_lettered" };
  }

  await updateIngestDelivery(ctx, delivery._id, {
    status: "retry_pending",
    attempts,
    lastAttemptAt: Date.now(),
    lastError: error,
  });
  await recordIngestDeliveryTimelineEvent(ctx, {
    workspaceId,
    projectId: delivery.projectId,
    type: "ingest.delivery_retry_pending",
    title: `Retry pending for ${delivery.source}`,
    summary: error,
    source: delivery.source,
    deliveryStatus: "retry_pending",
  });
  return { status: "retry_pending" };
}

export async function replayFromJournal(
  ctx: MutationCtx,
  args: ReliabilityWorkspaceArgs & {
    deliveryId: Id<"ingestDeliveries">;
    journalRef: string;
  },
): Promise<IngestPipelineResult> {
  const workspace = await resolveReliabilityWorkspace(ctx, args);
  const delivery = await ctx.db.get(args.deliveryId);
  if (!delivery || delivery.workspaceId !== workspace._id) {
    throw new Error("Delivery not found");
  }
  const envelope = await readJournalEntry(ctx, args.journalRef);
  const written = await completeDeliveryWriteInternal(ctx, {
    workspaceId: workspace._id,
    deliveryId: args.deliveryId,
    payload: envelope.payload,
    replayed: true,
  });
  return {
    ok: true,
    duplicate: written.duplicate,
    eventId: written.eventId,
    deliveryId: args.deliveryId,
    status: written.status,
    journalRef: args.journalRef,
  };
}

export async function resolveWorkspaceExternalId(
  ctx: Pick<MutationCtx, "db">,
  workspaceExternalId: string,
): Promise<Id<"workspaces">> {
  const workspace = await getWorkspaceDocByExternalId(ctx, workspaceExternalId);
  return workspace._id;
}

export type { NormalizedIngestEvent };
