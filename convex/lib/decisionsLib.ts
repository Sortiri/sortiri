import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { filterDecisionsByAccess } from "./decisionPermissions";
import { recordDecisionTimelineEvent } from "./decisionTimeline";
import type { AccessibleProjects } from "./projectAccessLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type DecisionRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  title: string;
  summary?: string;
  status: Doc<"decisions">["status"];
  decisionType: Doc<"decisions">["decisionType"];
  source: Doc<"decisions">["source"];
  sourceRef?: Doc<"decisions">["sourceRef"];
  decidedBy?: Doc<"decisions">["decidedBy"];
  entities?: string[];
  tags?: string[];
  linkedEventIds?: string[];
  linkedWorkstreamIds?: string[];
  linkedEntityIds?: string[];
  linkedArtifactIds?: string[];
  rationale?: string;
  expectedOutcome?: string;
  rollbackPlan?: string;
  timelineEventId?: string;
  decidedAt: number;
  createdAt: number;
  updatedAt: number;
};

export function docToDecision(doc: Doc<"decisions">): DecisionRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    workstreamId: doc.workstreamId,
    title: doc.title,
    summary: doc.summary,
    status: doc.status,
    decisionType: doc.decisionType,
    source: doc.source,
    sourceRef: doc.sourceRef,
    decidedBy: doc.decidedBy,
    entities: doc.entities,
    tags: doc.tags,
    linkedEventIds: doc.linkedEventIds,
    linkedWorkstreamIds: doc.linkedWorkstreamIds,
    linkedEntityIds: doc.linkedEntityIds,
    linkedArtifactIds: doc.linkedArtifactIds,
    rationale: doc.rationale,
    expectedOutcome: doc.expectedOutcome,
    rollbackPlan: doc.rollbackPlan,
    timelineEventId: doc.timelineEventId,
    decidedAt: doc.decidedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type CreateDecisionInput = {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  title: string;
  summary?: string;
  status?: Doc<"decisions">["status"];
  decisionType: Doc<"decisions">["decisionType"];
  source: Doc<"decisions">["source"];
  sourceRef?: Doc<"decisions">["sourceRef"];
  decidedBy?: Doc<"decisions">["decidedBy"];
  entities?: string[];
  tags?: string[];
  rationale?: string;
  expectedOutcome?: string;
  rollbackPlan?: string;
  decidedAt?: number;
  skipTimelineEvent?: boolean;
};

export async function createDecisionDoc(
  ctx: DbWriteCtx,
  input: CreateDecisionInput,
): Promise<Doc<"decisions">> {
  const now = Date.now();
  const decidedAt = input.decidedAt ?? now;
  const decisionId = await ctx.db.insert("decisions", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    title: input.title,
    summary: input.summary,
    status: input.status ?? "active",
    decisionType: input.decisionType,
    source: input.source,
    sourceRef: input.sourceRef,
    decidedBy: input.decidedBy,
    entities: input.entities,
    tags: input.tags,
    linkedWorkstreamIds: input.workstreamId ? [input.workstreamId] : undefined,
    rationale: input.rationale,
    expectedOutcome: input.expectedOutcome,
    rollbackPlan: input.rollbackPlan,
    decidedAt,
    createdAt: now,
    updatedAt: now,
  });

  const doc = (await ctx.db.get(decisionId))!;

  if (!input.skipTimelineEvent) {
    const eventId = await recordDecisionTimelineEvent(ctx, {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      workstreamId: input.workstreamId,
      decisionId,
      title: input.title,
      summary: input.summary,
      source: input.source,
      decidedBy: input.decidedBy,
      tags: input.tags,
      occurredAt: decidedAt,
    });
    await ctx.db.patch(decisionId, { timelineEventId: eventId, updatedAt: Date.now() });
    return (await ctx.db.get(decisionId))!;
  }

  return doc;
}

export async function listDecisionsForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  accessible: AccessibleProjects,
  role: string,
  options?: {
    status?: Doc<"decisions">["status"];
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    limit?: number;
  },
): Promise<DecisionRecord[]> {
  const query = ctx.db
    .query("decisions")
    .withIndex("by_workspace_created_at", (q) => q.eq("workspaceId", workspaceId))
    .order("desc");

  const rows = await query.take(options?.limit ?? 100);
  let filtered = filterDecisionsByAccess(rows, accessible, role);

  if (options?.status) {
    filtered = filtered.filter((d) => d.status === options.status);
  }
  if (options?.projectId) {
    filtered = filtered.filter((d) => d.projectId === options.projectId);
  }
  if (options?.workstreamId) {
    filtered = filtered.filter(
      (d) =>
        d.workstreamId === options.workstreamId ||
        d.linkedWorkstreamIds?.includes(options.workstreamId!),
    );
  }

  return filtered.map(docToDecision);
}

export async function updateDecisionDoc(
  ctx: DbWriteCtx,
  decisionId: Id<"decisions">,
  patch: Partial<
    Pick<
      Doc<"decisions">,
      | "title"
      | "summary"
      | "status"
      | "decisionType"
      | "rationale"
      | "expectedOutcome"
      | "rollbackPlan"
      | "tags"
      | "entities"
    >
  >,
): Promise<Doc<"decisions">> {
  await ctx.db.patch(decisionId, { ...patch, updatedAt: Date.now() });
  return (await ctx.db.get(decisionId))!;
}

export async function linkDecisionToWorkstreamDoc(
  ctx: DbWriteCtx,
  decisionId: Id<"decisions">,
  workstreamId: Id<"workstreams">,
): Promise<Doc<"decisions">> {
  const doc = await ctx.db.get(decisionId);
  if (!doc) throw new Error("Decision not found");
  const linked = new Set(doc.linkedWorkstreamIds ?? []);
  linked.add(workstreamId);
  await ctx.db.patch(decisionId, {
    workstreamId: doc.workstreamId ?? workstreamId,
    linkedWorkstreamIds: [...linked],
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(decisionId))!;
}

export async function linkDecisionToEventDoc(
  ctx: DbWriteCtx,
  decisionId: Id<"decisions">,
  eventId: Id<"events">,
): Promise<Doc<"decisions">> {
  const doc = await ctx.db.get(decisionId);
  if (!doc) throw new Error("Decision not found");
  const linked = new Set(doc.linkedEventIds ?? []);
  linked.add(eventId);
  await ctx.db.patch(decisionId, {
    linkedEventIds: [...linked],
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(decisionId))!;
}

export async function linkDecisionToEntityDoc(
  ctx: DbWriteCtx,
  decisionId: Id<"decisions">,
  entityId: Id<"entities">,
): Promise<Doc<"decisions">> {
  const doc = await ctx.db.get(decisionId);
  if (!doc) throw new Error("Decision not found");
  const linked = new Set(doc.linkedEntityIds ?? []);
  linked.add(entityId);
  await ctx.db.patch(decisionId, {
    linkedEntityIds: [...linked],
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(decisionId))!;
}
