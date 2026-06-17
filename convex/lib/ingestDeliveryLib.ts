import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type IngestDeliveryStatus = Doc<"ingestDeliveries">["status"];

export const MAX_INGEST_RETRY_ATTEMPTS = 3;

type DbRead = Pick<QueryCtx, "db">;
type DbWrite = Pick<MutationCtx, "db">;

export async function findDeliveryByIdempotencyKey(
  ctx: DbRead,
  idempotencyKey: string,
): Promise<Doc<"ingestDeliveries"> | null> {
  return ctx.db
    .query("ingestDeliveries")
    .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", idempotencyKey))
    .unique();
}

export async function findDeliveryById(
  ctx: DbRead,
  deliveryId: Id<"ingestDeliveries">,
): Promise<Doc<"ingestDeliveries"> | null> {
  return ctx.db.get(deliveryId);
}

export async function createIngestDelivery(
  ctx: DbWrite,
  input: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    envelopeId: string;
    idempotencyKey: string;
    source: string;
    sourceEventId: string;
    status: IngestDeliveryStatus;
    journalRef?: string;
    redacted?: boolean;
    sensitiveFindings?: string[];
    receivedAt: number;
  },
): Promise<Id<"ingestDeliveries">> {
  const now = Date.now();
  return ctx.db.insert("ingestDeliveries", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    envelopeId: input.envelopeId,
    idempotencyKey: input.idempotencyKey,
    source: input.source,
    sourceEventId: input.sourceEventId,
    status: input.status,
    journalRef: input.journalRef,
    attempts: 0,
    redacted: input.redacted,
    sensitiveFindings: input.sensitiveFindings,
    receivedAt: input.receivedAt,
    updatedAt: now,
  });
}

export async function updateIngestDelivery(
  ctx: DbWrite,
  deliveryId: Id<"ingestDeliveries">,
  patch: Partial<{
    status: IngestDeliveryStatus;
    eventId: Id<"events">;
    journalRef: string;
    attempts: number;
    lastAttemptAt: number;
    lastError: string;
  }>,
): Promise<void> {
  await ctx.db.patch(deliveryId, {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function listDeliveriesForWorkspace(
  ctx: DbRead,
  workspaceId: Id<"workspaces">,
  options?: {
    status?: IngestDeliveryStatus;
    source?: string;
    limit?: number;
  },
): Promise<Doc<"ingestDeliveries">[]> {
  const limit = options?.limit ?? 100;
  let rows: Doc<"ingestDeliveries">[];

  if (options?.status) {
    rows = await ctx.db
      .query("ingestDeliveries")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", workspaceId).eq("status", options.status!),
      )
      .order("desc")
      .take(limit * 2);
  } else {
    rows = await ctx.db
      .query("ingestDeliveries")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .order("desc")
      .take(limit * 2);
  }

  if (options?.source) {
    rows = rows.filter((r) => r.source === options.source);
  }

  return rows.slice(0, limit);
}

export function isSuccessfulDelivery(
  status: IngestDeliveryStatus,
): boolean {
  return (
    status === "convex_written" ||
    status === "replayed" ||
    status === "duplicate"
  );
}

export function docToIngestDeliverySummary(doc: Doc<"ingestDeliveries">) {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    envelopeId: doc.envelopeId,
    idempotencyKey: doc.idempotencyKey,
    source: doc.source,
    sourceEventId: doc.sourceEventId,
    status: doc.status,
    eventId: doc.eventId,
    journalRef: doc.journalRef,
    attempts: doc.attempts,
    lastAttemptAt: doc.lastAttemptAt,
    lastError: doc.lastError,
    redacted: doc.redacted,
    sensitiveFindings: doc.sensitiveFindings,
    receivedAt: doc.receivedAt,
    updatedAt: doc.updatedAt,
  };
}
