import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  assertNotAuditorWorkspaceBrowse,
  canViewEvent,
  canViewWorkstream,
  canWriteWorkspaceData,
  getMembershipAndAccessible,
} from "./authz";
import { isArtifactSafeForAudit, isEventSafeForAudit } from "./sensitiveContent";
import { assertRecommendationCopy } from "./recommendationCopy";
import type { AccessibleProjects } from "./projectAccessLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type RecommendationInput = {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  entityId?: Id<"entities">;
  viewId?: Id<"savedViews">;
  title: string;
  summary: string;
  type: Doc<"recommendations">["type"];
  source: Doc<"recommendations">["source"];
  status?: Doc<"recommendations">["status"];
  priority: Doc<"recommendations">["priority"];
  confidence: Doc<"recommendations">["confidence"];
  reason?: string;
  suggestedGoal?: string;
  suggestedWorkstreamTitle?: string;
  recommendedPlaybookId?: Id<"playbooks">;
  generatedContextPackId?: Id<"contextPacks">;
  convertedWorkstreamId?: Id<"workstreams">;
  validationRequirements?: Doc<"recommendations">["validationRequirements"];
  evidenceEventIds?: Id<"events">[];
  evidenceWorkstreamIds?: Id<"workstreams">[];
  evidenceEntityIds?: Id<"entities">[];
  evidenceImpactAnalysisIds?: Id<"impactAnalyses">[];
  evidenceLessonIds?: Id<"lessons">[];
  evidencePlaybookIds?: Id<"playbooks">[];
  evidenceInsightFindingIds?: Id<"insightFindings">[];
  evidenceArtifactIds?: Id<"artifacts">[];
  dismissedReason?: string;
  dedupKey?: string;
  createdBy?: Doc<"recommendations">["createdBy"];
};

export type RecommendationRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  entityId?: string;
  viewId?: string;
  title: string;
  summary: string;
  type: Doc<"recommendations">["type"];
  source: Doc<"recommendations">["source"];
  status: Doc<"recommendations">["status"];
  priority: Doc<"recommendations">["priority"];
  confidence: Doc<"recommendations">["confidence"];
  reason?: string;
  suggestedGoal?: string;
  suggestedWorkstreamTitle?: string;
  recommendedPlaybookId?: string;
  generatedContextPackId?: string;
  convertedWorkstreamId?: string;
  validationRequirements?: NonNullable<Doc<"recommendations">["validationRequirements"]>;
  evidenceEventIds?: string[];
  evidenceWorkstreamIds?: string[];
  evidenceEntityIds?: string[];
  evidenceImpactAnalysisIds?: string[];
  evidenceLessonIds?: string[];
  evidencePlaybookIds?: string[];
  evidenceInsightFindingIds?: string[];
  evidenceArtifactIds?: string[];
  dismissedReason?: string;
  dedupKey?: string;
  createdBy?: Doc<"recommendations">["createdBy"];
  createdAt: number;
  updatedAt: number;
};

export function docToRecommendation(doc: Doc<"recommendations">): RecommendationRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    workstreamId: doc.workstreamId,
    entityId: doc.entityId,
    viewId: doc.viewId,
    title: doc.title,
    summary: doc.summary,
    type: doc.type,
    source: doc.source,
    status: doc.status,
    priority: doc.priority,
    confidence: doc.confidence,
    reason: doc.reason,
    suggestedGoal: doc.suggestedGoal,
    suggestedWorkstreamTitle: doc.suggestedWorkstreamTitle,
    recommendedPlaybookId: doc.recommendedPlaybookId,
    generatedContextPackId: doc.generatedContextPackId,
    convertedWorkstreamId: doc.convertedWorkstreamId,
    validationRequirements: doc.validationRequirements,
    evidenceEventIds: doc.evidenceEventIds,
    evidenceWorkstreamIds: doc.evidenceWorkstreamIds,
    evidenceEntityIds: doc.evidenceEntityIds,
    evidenceImpactAnalysisIds: doc.evidenceImpactAnalysisIds,
    evidenceLessonIds: doc.evidenceLessonIds,
    evidencePlaybookIds: doc.evidencePlaybookIds,
    evidenceInsightFindingIds: doc.evidenceInsightFindingIds,
    evidenceArtifactIds: doc.evidenceArtifactIds,
    dismissedReason: doc.dismissedReason,
    dedupKey: doc.dedupKey,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function validateRecommendationInput(input: {
  title: string;
  summary: string;
  reason?: string;
}): void {
  if (!assertRecommendationCopy(input.title) || !assertRecommendationCopy(input.summary)) {
    throw new Error("Recommendation copy must use cautious language");
  }
  if (input.reason && !assertRecommendationCopy(input.reason)) {
    throw new Error("Recommendation reason must use cautious language");
  }
}

export async function createRecommendationDoc(
  ctx: DbWriteCtx,
  input: RecommendationInput,
): Promise<Id<"recommendations">> {
  validateRecommendationInput(input);
  const now = Date.now();
  return ctx.db.insert("recommendations", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    entityId: input.entityId,
    viewId: input.viewId,
    title: input.title,
    summary: input.summary,
    type: input.type,
    source: input.source,
    status: input.status ?? "open",
    priority: input.priority,
    confidence: input.confidence,
    reason: input.reason,
    suggestedGoal: input.suggestedGoal,
    suggestedWorkstreamTitle: input.suggestedWorkstreamTitle,
    recommendedPlaybookId: input.recommendedPlaybookId,
    generatedContextPackId: input.generatedContextPackId,
    convertedWorkstreamId: input.convertedWorkstreamId,
    validationRequirements: input.validationRequirements,
    evidenceEventIds: input.evidenceEventIds,
    evidenceWorkstreamIds: input.evidenceWorkstreamIds,
    evidenceEntityIds: input.evidenceEntityIds,
    evidenceImpactAnalysisIds: input.evidenceImpactAnalysisIds,
    evidenceLessonIds: input.evidenceLessonIds,
    evidencePlaybookIds: input.evidencePlaybookIds,
    evidenceInsightFindingIds: input.evidenceInsightFindingIds,
    evidenceArtifactIds: input.evidenceArtifactIds,
    dismissedReason: input.dismissedReason,
    dedupKey: input.dedupKey,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function patchRecommendationDoc(
  ctx: DbWriteCtx,
  id: Id<"recommendations">,
  patch: Partial<Omit<RecommendationInput, "workspaceId">> & { updatedAt?: number },
): Promise<void> {
  if (patch.title !== undefined || patch.summary !== undefined || patch.reason !== undefined) {
    const existing = await ctx.db.get(id);
    validateRecommendationInput({
      title: patch.title ?? existing?.title ?? "",
      summary: patch.summary ?? existing?.summary ?? "",
      reason: patch.reason ?? existing?.reason,
    });
  }
  await ctx.db.patch(id, {
    ...patch,
    updatedAt: patch.updatedAt ?? Date.now(),
  });
}

export async function findOpenRecommendationByDedupKey(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  dedupKey: string,
): Promise<Doc<"recommendations"> | null> {
  const doc = await ctx.db
    .query("recommendations")
    .withIndex("by_workspace_dedup_key", (q) =>
      q.eq("workspaceId", workspaceId).eq("dedupKey", dedupKey),
    )
    .first();
  if (!doc || doc.status !== "open") return null;
  return doc;
}

export async function assertRecommendationAccess(
  ctx: Parameters<typeof getMembershipAndAccessible>[0],
  recommendationId: Id<"recommendations">,
  clerkUserId: string,
  options?: { requireWrite?: boolean },
) {
  const doc = await ctx.db.get(recommendationId);
  if (!doc) throw new Error("Recommendation not found");

  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    doc.workspaceId,
    clerkUserId,
  );
  assertNotAuditorWorkspaceBrowse(membership);

  if (doc.projectId && accessible !== "all" && !accessible.has(doc.projectId)) {
    throw new Error("Access denied");
  }

  if (options?.requireWrite && !canWriteWorkspaceData(membership.role)) {
    throw new Error("Access denied");
  }

  return { doc, membership, accessible };
}

export async function filterRecommendationEvidence(
  ctx: DbReadCtx,
  recommendation: RecommendationRecord,
  accessible: AccessibleProjects,
): Promise<RecommendationRecord> {
  const filtered = { ...recommendation };

  if (filtered.evidenceEventIds?.length) {
    const ids: string[] = [];
    for (const eventId of filtered.evidenceEventIds) {
      const event = await ctx.db.get(eventId as Id<"events">);
      if (event && canViewEvent(event, accessible) && isEventSafeForAudit(event)) {
        ids.push(eventId);
      }
    }
    filtered.evidenceEventIds = ids;
  }

  if (filtered.evidenceWorkstreamIds?.length) {
    const ids: string[] = [];
    for (const wsId of filtered.evidenceWorkstreamIds) {
      const ws = await ctx.db.get(wsId as Id<"workstreams">);
      if (ws && canViewWorkstream(ws, accessible)) ids.push(wsId);
    }
    filtered.evidenceWorkstreamIds = ids;
  }

  if (filtered.evidenceArtifactIds?.length) {
    const ids: string[] = [];
    for (const artifactId of filtered.evidenceArtifactIds) {
      const artifact = await ctx.db.get(artifactId as Id<"artifacts">);
      if (artifact && isArtifactSafeForAudit(artifact)) ids.push(artifactId);
    }
    filtered.evidenceArtifactIds = ids;
  }

  return filtered;
}

const PRIORITY_ORDER: Record<Doc<"recommendations">["priority"], number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export async function listRecommendationsForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options?: {
    status?: Doc<"recommendations">["status"];
    priority?: Doc<"recommendations">["priority"];
    source?: Doc<"recommendations">["source"];
    projectId?: Id<"projects">;
    limit?: number;
  },
): Promise<RecommendationRecord[]> {
  let docs = await ctx.db
    .query("recommendations")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .collect();

  if (options?.status) {
    docs = docs.filter((doc) => doc.status === options.status);
  }
  if (options?.priority) {
    docs = docs.filter((doc) => doc.priority === options.priority);
  }
  if (options?.source) {
    docs = docs.filter((doc) => doc.source === options.source);
  }
  if (options?.projectId) {
    docs = docs.filter((doc) => doc.projectId === options.projectId);
  }

  docs.sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.createdAt - a.createdAt;
  });

  const limit = options?.limit ?? 100;
  return docs.slice(0, limit).map(docToRecommendation);
}

export async function listRecommendationsForProject(
  ctx: DbReadCtx,
  projectId: Id<"projects">,
  options?: {
    status?: Doc<"recommendations">["status"];
    limit?: number;
  },
): Promise<RecommendationRecord[]> {
  const docs = await ctx.db
    .query("recommendations")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .order("desc")
    .collect();

  const filtered = options?.status
    ? docs.filter((doc) => doc.status === options.status)
    : docs;

  const limit = options?.limit ?? 100;
  return filtered.slice(0, limit).map(docToRecommendation);
}
