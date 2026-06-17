import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type DeadLetterStatus = Doc<"ingestDeadLetters">["status"];

type DbRead = Pick<QueryCtx, "db">;
type DbWrite = Pick<MutationCtx, "db">;

export async function createDeadLetter(
  ctx: DbWrite,
  input: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    envelopeId: string;
    idempotencyKey: string;
    source: string;
    sourceEventId: string;
    journalRef?: string;
    deliveryId?: Id<"ingestDeliveries">;
    reason: string;
    error?: string;
    payloadPreview?: string;
    sensitiveFindings?: string[];
    redacted?: boolean;
    attempts: number;
  },
): Promise<Id<"ingestDeadLetters">> {
  const now = Date.now();
  return ctx.db.insert("ingestDeadLetters", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    envelopeId: input.envelopeId,
    idempotencyKey: input.idempotencyKey,
    source: input.source,
    sourceEventId: input.sourceEventId,
    journalRef: input.journalRef,
    deliveryId: input.deliveryId,
    reason: input.reason,
    error: input.error,
    payloadPreview: input.payloadPreview,
    sensitiveFindings: input.sensitiveFindings,
    redacted: input.redacted,
    attempts: input.attempts,
    status: "open",
    createdAt: now,
    updatedAt: now,
  });
}

export async function findDeadLetterById(
  ctx: DbRead,
  deadLetterId: Id<"ingestDeadLetters">,
): Promise<Doc<"ingestDeadLetters"> | null> {
  return ctx.db.get(deadLetterId);
}

export async function updateDeadLetterStatus(
  ctx: DbWrite,
  deadLetterId: Id<"ingestDeadLetters">,
  status: DeadLetterStatus,
): Promise<void> {
  await ctx.db.patch(deadLetterId, {
    status,
    updatedAt: Date.now(),
  });
}

export async function listDeadLettersForWorkspace(
  ctx: DbRead,
  workspaceId: Id<"workspaces">,
  options?: { status?: DeadLetterStatus; limit?: number },
): Promise<Doc<"ingestDeadLetters">[]> {
  const limit = options?.limit ?? 100;
  if (options?.status) {
    return ctx.db
      .query("ingestDeadLetters")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", workspaceId).eq("status", options.status!),
      )
      .order("desc")
      .take(limit);
  }
  return ctx.db
    .query("ingestDeadLetters")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(limit);
}

export function docToDeadLetterSummary(doc: Doc<"ingestDeadLetters">) {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    envelopeId: doc.envelopeId,
    idempotencyKey: doc.idempotencyKey,
    source: doc.source,
    sourceEventId: doc.sourceEventId,
    journalRef: doc.journalRef,
    deliveryId: doc.deliveryId,
    reason: doc.reason,
    error: doc.error,
    payloadPreview: doc.payloadPreview,
    sensitiveFindings: doc.sensitiveFindings,
    redacted: doc.redacted,
    attempts: doc.attempts,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
