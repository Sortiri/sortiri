import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { docToWorkstream, type WorkstreamRecord } from "./workstreamsLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type PinnedReplayRecord = {
  id: string;
  workspaceId: string;
  workstreamId: string;
  label?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type PinnedReplayWithWorkstream = {
  pin: PinnedReplayRecord;
  workstream: WorkstreamRecord;
};

export function docToPinnedReplay(doc: Doc<"pinnedReplays">): PinnedReplayRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    workstreamId: doc.workstreamId,
    label: doc.label,
    note: doc.note,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function findPinForWorkstream(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  workstreamId: Id<"workstreams">,
): Promise<Doc<"pinnedReplays"> | null> {
  const pin = await ctx.db
    .query("pinnedReplays")
    .withIndex("by_workspace_workstream", (q) =>
      q.eq("workspaceId", workspaceId).eq("workstreamId", workstreamId),
    )
    .first();
  return pin ?? null;
}

export async function insertPinDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    workstreamId: Id<"workstreams">;
    pinnedBy?: Doc<"pinnedReplays">["pinnedBy"];
    label?: string;
    note?: string;
  },
): Promise<Id<"pinnedReplays">> {
  const now = Date.now();
  return ctx.db.insert("pinnedReplays", {
    workspaceId: input.workspaceId,
    workstreamId: input.workstreamId,
    pinnedBy: input.pinnedBy,
    label: input.label,
    note: input.note,
    createdAt: now,
    updatedAt: now,
  });
}

export async function deletePinDoc(
  ctx: DbWriteCtx,
  pinId: Id<"pinnedReplays">,
): Promise<void> {
  await ctx.db.delete(pinId);
}

export async function hydratePinnedReplay(
  ctx: DbReadCtx,
  pinDoc: Doc<"pinnedReplays">,
): Promise<PinnedReplayWithWorkstream | null> {
  const workstream = await ctx.db.get(pinDoc.workstreamId);
  if (!workstream) return null;

  return {
    pin: docToPinnedReplay(pinDoc),
    workstream: docToWorkstream(workstream),
  };
}

export async function listPinnedForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  limit = 10,
): Promise<PinnedReplayWithWorkstream[]> {
  const pins = await ctx.db
    .query("pinnedReplays")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(limit);

  const results: PinnedReplayWithWorkstream[] = [];
  for (const pin of pins) {
    const hydrated = await hydratePinnedReplay(ctx, pin);
    if (hydrated) results.push(hydrated);
  }
  return results;
}
