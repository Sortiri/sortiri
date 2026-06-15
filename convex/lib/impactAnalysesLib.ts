import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type ImpactAnalysisStatus = "draft" | "generated" | "failed" | "archived";

export type ImpactAnchor = {
  type: "event" | "workstream" | "project" | "view" | "entity" | "manual";
  eventId?: string;
  workstreamId?: string;
  projectId?: string;
  viewId?: string;
  entityId?: string;
  title: string;
  occurredAt: number;
};

export type ImpactAnalysisRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  viewId?: string;
  title: string;
  summary?: string;
  status: ImpactAnalysisStatus;
  anchor: ImpactAnchor;
  window: {
    beforeMs: number;
    afterMs: number;
    baselineStart: number;
    baselineEnd: number;
    impactStart: number;
    impactEnd: number;
  };
  filters?: {
    categories?: string[];
    sources?: string[];
    entityTypes?: string[];
    projectIds?: string[];
    visibility?: "primary" | "all";
  };
  metrics?: {
    baseline: unknown;
    impact: unknown;
    delta: unknown;
  };
  generatedSummary?: string;
  createdBy?: Doc<"impactAnalyses">["createdBy"];
  generatedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type ImpactFindingConfidence = "possible" | "likely" | "strong";

export type ImpactFindingInput = {
  type: Doc<"impactFindings">["type"];
  severity: Doc<"impactFindings">["severity"];
  confidence: ImpactFindingConfidence;
  title: string;
  summary: string;
  evidenceEventIds?: Id<"events">[];
  evidenceWorkstreamIds?: Id<"workstreams">[];
  evidenceEntityIds?: Id<"entities">[];
  evidenceArtifactIds?: Id<"artifacts">[];
  metrics?: unknown;
};

export type ImpactFindingRecord = {
  id: string;
  workspaceId: string;
  analysisId: string;
  type: Doc<"impactFindings">["type"];
  severity: Doc<"impactFindings">["severity"];
  confidence: ImpactFindingConfidence;
  title: string;
  summary: string;
  evidenceEventIds?: string[];
  evidenceWorkstreamIds?: string[];
  evidenceEntityIds?: string[];
  evidenceArtifactIds?: string[];
  metrics?: unknown;
  createdAt: number;
};

const SEVERITY_ORDER: Record<Doc<"impactFindings">["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function docToImpactAnalysis(doc: Doc<"impactAnalyses">): ImpactAnalysisRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    viewId: doc.viewId,
    title: doc.title,
    summary: doc.summary,
    status: doc.status,
    anchor: {
      type: doc.anchor.type,
      eventId: doc.anchor.eventId,
      workstreamId: doc.anchor.workstreamId,
      projectId: doc.anchor.projectId,
      viewId: doc.anchor.viewId,
      entityId: doc.anchor.entityId,
      title: doc.anchor.title,
      occurredAt: doc.anchor.occurredAt,
    },
    window: doc.window,
    filters: doc.filters,
    metrics: doc.metrics,
    generatedSummary: doc.generatedSummary,
    createdBy: doc.createdBy,
    generatedAt: doc.generatedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function docToImpactFinding(doc: Doc<"impactFindings">): ImpactFindingRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    analysisId: doc.analysisId,
    type: doc.type,
    severity: doc.severity,
    confidence: doc.confidence,
    title: doc.title,
    summary: doc.summary,
    evidenceEventIds: doc.evidenceEventIds,
    evidenceWorkstreamIds: doc.evidenceWorkstreamIds,
    evidenceEntityIds: doc.evidenceEntityIds,
    evidenceArtifactIds: doc.evidenceArtifactIds,
    metrics: doc.metrics,
    createdAt: doc.createdAt,
  };
}

export async function createImpactAnalysisDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    viewId?: Id<"savedViews">;
    title: string;
    anchor: Doc<"impactAnalyses">["anchor"];
    window: Doc<"impactAnalyses">["window"];
    filters?: Doc<"impactAnalyses">["filters"];
    createdBy?: Doc<"impactAnalyses">["createdBy"];
  },
): Promise<Id<"impactAnalyses">> {
  const now = Date.now();
  return ctx.db.insert("impactAnalyses", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    viewId: input.viewId,
    title: input.title,
    status: "draft",
    anchor: input.anchor,
    window: input.window,
    filters: input.filters,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function completeImpactAnalysisDoc(
  ctx: DbWriteCtx,
  input: {
    analysisId: Id<"impactAnalyses">;
    metrics: Doc<"impactAnalyses">["metrics"];
    generatedSummary: string;
  },
): Promise<void> {
  const now = Date.now();
  await ctx.db.patch(input.analysisId, {
    status: "generated",
    metrics: input.metrics,
    generatedSummary: input.generatedSummary,
    generatedAt: now,
    updatedAt: now,
  });
}

export async function failImpactAnalysisDoc(
  ctx: DbWriteCtx,
  analysisId: Id<"impactAnalyses">,
  error: string,
): Promise<void> {
  await ctx.db.patch(analysisId, {
    status: "failed",
    summary: error,
    updatedAt: Date.now(),
  });
}

export async function deleteFindingsForAnalysis(
  ctx: DbWriteCtx,
  analysisId: Id<"impactAnalyses">,
): Promise<void> {
  const findings = await ctx.db
    .query("impactFindings")
    .withIndex("by_analysis", (q) => q.eq("analysisId", analysisId))
    .collect();
  for (const finding of findings) {
    await ctx.db.delete(finding._id);
  }
}

export async function insertImpactFindingDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    analysisId: Id<"impactAnalyses">;
    finding: ImpactFindingInput;
  },
): Promise<Id<"impactFindings">> {
  return ctx.db.insert("impactFindings", {
    workspaceId: input.workspaceId,
    analysisId: input.analysisId,
    type: input.finding.type,
    severity: input.finding.severity,
    confidence: input.finding.confidence,
    title: input.finding.title,
    summary: input.finding.summary,
    evidenceEventIds: input.finding.evidenceEventIds,
    evidenceWorkstreamIds: input.finding.evidenceWorkstreamIds,
    evidenceEntityIds: input.finding.evidenceEntityIds,
    evidenceArtifactIds: input.finding.evidenceArtifactIds,
    metrics: input.finding.metrics,
    createdAt: Date.now(),
  });
}

export async function listImpactAnalysesForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  limit = 20,
): Promise<ImpactAnalysisRecord[]> {
  const docs = await ctx.db
    .query("impactAnalyses")
    .withIndex("by_workspace_created_at", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(limit);
  return docs.map(docToImpactAnalysis);
}

export async function listFindingsForAnalysis(
  ctx: DbReadCtx,
  analysisId: Id<"impactAnalyses">,
): Promise<ImpactFindingRecord[]> {
  const docs = await ctx.db
    .query("impactFindings")
    .withIndex("by_analysis", (q) => q.eq("analysisId", analysisId))
    .collect();
  return docs
    .map(docToImpactFinding)
    .sort((a, b) => {
      const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.createdAt - a.createdAt;
    });
}
