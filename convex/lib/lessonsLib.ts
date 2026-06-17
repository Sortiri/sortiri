import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { assertLessonCopy } from "./lessonCopy";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type LessonInput = {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  viewId?: Id<"savedViews">;
  workstreamId?: Id<"workstreams">;
  entityId?: Id<"entities">;
  impactAnalysisId?: Id<"impactAnalyses">;
  title: string;
  summary: string;
  type: Doc<"lessons">["type"];
  status: Doc<"lessons">["status"];
  confidence: Doc<"lessons">["confidence"];
  importance: Doc<"lessons">["importance"];
  source: Doc<"lessons">["source"];
  recommendation?: string;
  evidenceEventIds?: Id<"events">[];
  evidenceWorkstreamIds?: Id<"workstreams">[];
  evidenceEntityIds?: Id<"entities">[];
  evidenceImpactAnalysisIds?: Id<"impactAnalyses">[];
  evidenceInsightFindingIds?: Id<"insightFindings">[];
  evidenceArtifactIds?: Id<"artifacts">[];
  evidenceDecisionIds?: Id<"decisions">[];
  evidenceRollbackIds?: Id<"rollbackEvents">[];
  evidenceIncidentIds?: Id<"incidents">[];
  tags?: string[];
  createdBy?: Doc<"lessons">["createdBy"];
};

export type LessonRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  viewId?: string;
  workstreamId?: string;
  entityId?: string;
  impactAnalysisId?: string;
  title: string;
  summary: string;
  type: Doc<"lessons">["type"];
  status: Doc<"lessons">["status"];
  confidence: Doc<"lessons">["confidence"];
  importance: Doc<"lessons">["importance"];
  source: Doc<"lessons">["source"];
  recommendation?: string;
  evidenceEventIds?: string[];
  evidenceWorkstreamIds?: string[];
  evidenceEntityIds?: string[];
  evidenceImpactAnalysisIds?: string[];
  evidenceInsightFindingIds?: string[];
  evidenceArtifactIds?: string[];
  tags?: string[];
  createdBy?: Doc<"lessons">["createdBy"];
  createdAt: number;
  updatedAt: number;
};

export function docToLesson(doc: Doc<"lessons">): LessonRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    viewId: doc.viewId,
    workstreamId: doc.workstreamId,
    entityId: doc.entityId,
    impactAnalysisId: doc.impactAnalysisId,
    title: doc.title,
    summary: doc.summary,
    type: doc.type,
    status: doc.status,
    confidence: doc.confidence,
    importance: doc.importance,
    source: doc.source,
    recommendation: doc.recommendation,
    evidenceEventIds: doc.evidenceEventIds,
    evidenceWorkstreamIds: doc.evidenceWorkstreamIds,
    evidenceEntityIds: doc.evidenceEntityIds,
    evidenceImpactAnalysisIds: doc.evidenceImpactAnalysisIds,
    evidenceInsightFindingIds: doc.evidenceInsightFindingIds,
    evidenceArtifactIds: doc.evidenceArtifactIds,
    tags: doc.tags,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function validateLessonInput(input: {
  title: string;
  summary: string;
  recommendation?: string;
}): void {
  if (!assertLessonCopy(input.title) || !assertLessonCopy(input.summary)) {
    throw new Error("Lesson copy must use cautious language");
  }
  if (input.recommendation && !assertLessonCopy(input.recommendation)) {
    throw new Error("Lesson recommendation must use cautious language");
  }
}

export async function createLessonDoc(
  ctx: DbWriteCtx,
  input: LessonInput,
): Promise<Id<"lessons">> {
  validateLessonInput(input);
  const now = Date.now();
  return ctx.db.insert("lessons", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    viewId: input.viewId,
    workstreamId: input.workstreamId,
    entityId: input.entityId,
    impactAnalysisId: input.impactAnalysisId,
    title: input.title,
    summary: input.summary,
    type: input.type,
    status: input.status,
    confidence: input.confidence,
    importance: input.importance,
    source: input.source,
    recommendation: input.recommendation,
    evidenceEventIds: input.evidenceEventIds,
    evidenceWorkstreamIds: input.evidenceWorkstreamIds,
    evidenceEntityIds: input.evidenceEntityIds,
    evidenceImpactAnalysisIds: input.evidenceImpactAnalysisIds,
    evidenceInsightFindingIds: input.evidenceInsightFindingIds,
    evidenceArtifactIds: input.evidenceArtifactIds,
    evidenceDecisionIds: input.evidenceDecisionIds,
    evidenceRollbackIds: input.evidenceRollbackIds,
    evidenceIncidentIds: input.evidenceIncidentIds,
    tags: input.tags,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function patchLessonDoc(
  ctx: DbWriteCtx,
  lessonId: Id<"lessons">,
  patch: Partial<
    Pick<
      Doc<"lessons">,
      "status" | "title" | "summary" | "recommendation" | "importance" | "confidence"
    >
  >,
): Promise<void> {
  if (patch.title || patch.summary || patch.recommendation) {
    validateLessonInput({
      title: patch.title ?? "",
      summary: patch.summary ?? "",
      recommendation: patch.recommendation,
    });
  }
  await ctx.db.patch(lessonId, { ...patch, updatedAt: Date.now() });
}

export async function hasLessonWithTag(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  tag: string,
): Promise<boolean> {
  const lessons = await ctx.db
    .query("lessons")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  return lessons.some((lesson) => lesson.tags?.includes(tag));
}

export async function listLessonsForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options: {
    limit?: number;
    type?: Doc<"lessons">["type"];
    status?: Doc<"lessons">["status"];
  } = {},
): Promise<LessonRecord[]> {
  const limit = options.limit ?? 50;
  let docs;
  if (options.type) {
    docs = await ctx.db
      .query("lessons")
      .withIndex("by_workspace_type", (q) =>
        q.eq("workspaceId", workspaceId).eq("type", options.type!),
      )
      .order("desc")
      .take(limit);
  } else if (options.status) {
    docs = await ctx.db
      .query("lessons")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", workspaceId).eq("status", options.status!),
      )
      .order("desc")
      .take(limit);
  } else {
    docs = await ctx.db
      .query("lessons")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .order("desc")
      .take(limit);
  }
  return docs.map(docToLesson);
}

export async function listLessonsByImpactAnalysis(
  ctx: DbReadCtx,
  impactAnalysisId: Id<"impactAnalyses">,
): Promise<LessonRecord[]> {
  const docs = await ctx.db
    .query("lessons")
    .withIndex("by_impact", (q) => q.eq("impactAnalysisId", impactAnalysisId))
    .collect();
  return docs.map(docToLesson);
}

export async function listLessonsByProject(
  ctx: DbReadCtx,
  projectId: Id<"projects">,
): Promise<LessonRecord[]> {
  const docs = await ctx.db
    .query("lessons")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  return docs.map(docToLesson);
}

export async function listLessonsByEntity(
  ctx: DbReadCtx,
  entityId: Id<"entities">,
): Promise<LessonRecord[]> {
  const docs = await ctx.db
    .query("lessons")
    .withIndex("by_entity", (q) => q.eq("entityId", entityId))
    .collect();
  return docs.map(docToLesson);
}

export async function listLessonsByWorkstream(
  ctx: DbReadCtx,
  workstreamId: Id<"workstreams">,
): Promise<LessonRecord[]> {
  const docs = await ctx.db
    .query("lessons")
    .withIndex("by_workstream", (q) => q.eq("workstreamId", workstreamId))
    .collect();
  return docs.map(docToLesson);
}
