import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { recordRollbackTimelineEvent } from "./decisionTimeline";
import type { AccessibleProjects } from "./projectAccessLib";
import { filterDecisionsByAccess } from "./decisionPermissions";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type RollbackRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  decisionId?: string;
  title: string;
  summary?: string;
  source: Doc<"rollbackEvents">["source"];
  reason?: string;
  revertedEventIds?: string[];
  revertedArtifactIds?: string[];
  sourceRef?: unknown;
  timelineEventId?: string;
  rolledBackAt: number;
  createdAt: number;
  updatedAt: number;
};

export function docToRollback(doc: Doc<"rollbackEvents">): RollbackRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    workstreamId: doc.workstreamId,
    decisionId: doc.decisionId,
    title: doc.title,
    summary: doc.summary,
    source: doc.source,
    reason: doc.reason,
    revertedEventIds: doc.revertedEventIds,
    revertedArtifactIds: doc.revertedArtifactIds,
    sourceRef: doc.sourceRef,
    timelineEventId: doc.timelineEventId,
    rolledBackAt: doc.rolledBackAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type CreateRollbackInput = {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  decisionId?: Id<"decisions">;
  title: string;
  summary?: string;
  source: Doc<"rollbackEvents">["source"];
  reason?: string;
  revertedEventIds?: Id<"events">[];
  revertedArtifactIds?: Id<"artifacts">[];
  sourceRef?: unknown;
  rolledBackAt?: number;
  skipTimelineEvent?: boolean;
};

export async function createRollbackEventDoc(
  ctx: DbWriteCtx,
  input: CreateRollbackInput,
): Promise<Doc<"rollbackEvents">> {
  const now = Date.now();
  const rolledBackAt = input.rolledBackAt ?? now;
  const rollbackId = await ctx.db.insert("rollbackEvents", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    decisionId: input.decisionId,
    title: input.title,
    summary: input.summary,
    source: input.source,
    reason: input.reason,
    revertedEventIds: input.revertedEventIds,
    revertedArtifactIds: input.revertedArtifactIds,
    sourceRef: input.sourceRef,
    rolledBackAt,
    createdAt: now,
    updatedAt: now,
  });

  if (input.decisionId) {
    await ctx.db.patch(input.decisionId, { status: "rolled_back", updatedAt: Date.now() });
  }

  if (!input.skipTimelineEvent) {
    const eventId = await recordRollbackTimelineEvent(ctx, {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      workstreamId: input.workstreamId,
      rollbackId,
      decisionId: input.decisionId,
      title: input.title,
      summary: input.summary,
      source: input.source,
      occurredAt: rolledBackAt,
    });
    await ctx.db.patch(rollbackId, { timelineEventId: eventId, updatedAt: Date.now() });
  }

  return (await ctx.db.get(rollbackId))!;
}

export async function listRollbacksForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  accessible: AccessibleProjects,
  role: string,
  options?: { projectId?: Id<"projects">; limit?: number },
): Promise<RollbackRecord[]> {
  const rows = await ctx.db
    .query("rollbackEvents")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(options?.limit ?? 50);

  let filtered = rows;
  if (role === "auditor") return [];
  if (accessible !== "all") {
    filtered = filtered.filter((r) => !r.projectId || accessible.has(r.projectId));
  }
  if (options?.projectId) {
    filtered = filtered.filter((r) => r.projectId === options.projectId);
  }
  return filtered.map(docToRollback);
}

export async function listRollbacksForDecision(
  ctx: DbReadCtx,
  decisionId: Id<"decisions">,
): Promise<RollbackRecord[]> {
  const rows = await ctx.db
    .query("rollbackEvents")
    .withIndex("by_decision", (q) => q.eq("decisionId", decisionId))
    .collect();
  return rows.map(docToRollback);
}

export async function listRollbacksForIncident(
  ctx: DbReadCtx,
  linkedRollbackIds: Id<"rollbackEvents">[] | undefined,
): Promise<RollbackRecord[]> {
  if (!linkedRollbackIds?.length) return [];
  const rows = await Promise.all(linkedRollbackIds.map((id) => ctx.db.get(id)));
  return rows.filter((r): r is Doc<"rollbackEvents"> => r != null).map(docToRollback);
}
