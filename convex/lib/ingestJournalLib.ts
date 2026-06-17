import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  buildJournalRef,
  type IngestEventEnvelope,
} from "./ingestEnvelope";

export async function writeJournalEntry(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  envelope: IngestEventEnvelope,
): Promise<{ journalRef: string }> {
  const journalRef = buildJournalRef(envelope.envelopeId);
  await ctx.db.insert("ingestJournalEntries", {
    workspaceId,
    envelopeId: envelope.envelopeId,
    journalRef,
    source: envelope.source,
    sourceEventId: envelope.sourceEventId,
    idempotencyKey: envelope.idempotencyKey,
    receivedAt: envelope.receivedAt,
    envelope: { ...envelope, status: "journaled" },
    createdAt: Date.now(),
  });
  return { journalRef };
}

export async function readJournalEntry(
  ctx: Pick<QueryCtx, "db">,
  journalRef: string,
): Promise<IngestEventEnvelope> {
  const entry = await ctx.db
    .query("ingestJournalEntries")
    .withIndex("by_journal_ref", (q) => q.eq("journalRef", journalRef))
    .first();
  if (!entry) {
    throw new Error(`Journal entry not found: ${journalRef}`);
  }
  return entry.envelope as IngestEventEnvelope;
}

export async function listJournalEntries(
  ctx: Pick<QueryCtx, "db">,
  workspaceId: Id<"workspaces">,
  limit = 50,
): Promise<Doc<"ingestJournalEntries">[]> {
  return ctx.db
    .query("ingestJournalEntries")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(limit);
}
