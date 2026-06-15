import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getWorkspaceMembership } from "./authz";
import { getRelatedEventsForEvidence } from "./eventLinksLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type InsightRunStatus = "pending" | "completed" | "failed";

export type InsightRunRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  title: string;
  summary?: string;
  status: InsightRunStatus;
  windowStart: number;
  windowEnd: number;
  generatedBy?: Doc<"insightRuns">["generatedBy"];
  eventCount?: number;
  workstreamCount?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
};
export type InsightFindingType =
  | "hotspot"
  | "risk"
  | "sensitive_evidence"
  | "duplicate_work"
  | "error"
  | "stale_workstream"
  | "product_movement"
  | "decision"
  | "summary"
  | "impact_opportunity"
  | "lesson_opportunity"
  | "other";

export type InsightFindingSeverity = "info" | "warning" | "critical";

export type InsightFindingInput = {
  type: InsightFindingType;
  severity: InsightFindingSeverity;
  title: string;
  summary: string;
  recommendation?: string;
  evidenceEventIds?: Id<"events">[];
  evidenceWorkstreamIds?: Id<"workstreams">[];
  data?: unknown;
};

export type InsightFindingRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  runId: string;
  type: InsightFindingType;
  severity: InsightFindingSeverity;
  title: string;
  summary: string;
  recommendation?: string;
  evidenceEventIds?: string[];
  evidenceWorkstreamIds?: string[];
  data?: unknown;
  createdAt: number;
};

export type InsightEvidenceEvent = {
  id: string;
  title: string;
  workstreamId?: string;
  artifactIds?: string[];
  artifactCount?: number;
  primaryArtifactId?: string;
  primaryArtifactTitle?: string;
};

export type InsightEvidenceWorkstream = {
  id: string;
  title: string;
};

export type InsightFindingDetail = InsightFindingRecord & {
  evidence: {
    events: InsightEvidenceEvent[];
    workstreams: InsightEvidenceWorkstream[];
    relatedEvents: InsightEvidenceEvent[];
  };
};

const SEVERITY_ORDER: Record<InsightFindingSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function docToInsightRun(doc: Doc<"insightRuns">): InsightRunRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    title: doc.title,
    summary: doc.summary,
    status: doc.status,
    windowStart: doc.windowStart,
    windowEnd: doc.windowEnd,
    generatedBy: doc.generatedBy,
    eventCount: doc.eventCount,
    workstreamCount: doc.workstreamCount,
    error: doc.error,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function docToInsightFinding(doc: Doc<"insightFindings">): InsightFindingRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    runId: doc.runId,
    type: doc.type,
    severity: doc.severity,
    title: doc.title,
    summary: doc.summary,
    recommendation: doc.recommendation,
    evidenceEventIds: doc.evidenceEventIds,
    evidenceWorkstreamIds: doc.evidenceWorkstreamIds,
    data: doc.data,
    createdAt: doc.createdAt,
  };
}

export async function createInsightRunDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    viewId?: Id<"savedViews">;
    title: string;
    windowStart: number;
    windowEnd: number;
    generatedBy?: Doc<"insightRuns">["generatedBy"];
  },
): Promise<Id<"insightRuns">> {
  const now = Date.now();
  return ctx.db.insert("insightRuns", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    viewId: input.viewId,
    title: input.title,
    status: "pending",
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    generatedBy: input.generatedBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function completeInsightRunDoc(
  ctx: DbWriteCtx,
  input: {
    runId: Id<"insightRuns">;
    summary?: string;
    eventCount: number;
    workstreamCount: number;
    error?: string;
  },
): Promise<void> {
  await ctx.db.patch(input.runId, {
    summary: input.summary,
    status: "completed",
    eventCount: input.eventCount,
    workstreamCount: input.workstreamCount,
    error: input.error,
    updatedAt: Date.now(),
  });
}

export async function failInsightRunDoc(
  ctx: DbWriteCtx,
  input: {
    runId: Id<"insightRuns">;
    error: string;
  },
): Promise<void> {
  await ctx.db.patch(input.runId, {
    status: "failed",
    error: input.error,
    updatedAt: Date.now(),
  });
}

export async function insertInsightFindingDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    viewId?: Id<"savedViews">;
    runId: Id<"insightRuns">;
    finding: InsightFindingInput;
  },
): Promise<Id<"insightFindings">> {
  return ctx.db.insert("insightFindings", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    viewId: input.viewId,
    runId: input.runId,
    type: input.finding.type,
    severity: input.finding.severity,
    title: input.finding.title,
    summary: input.finding.summary,
    recommendation: input.finding.recommendation,
    evidenceEventIds: input.finding.evidenceEventIds,
    evidenceWorkstreamIds: input.finding.evidenceWorkstreamIds,
    data: input.finding.data,
    createdAt: Date.now(),
  });
}

export async function listInsightRunsForWorkspace(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  limit = 10,
): Promise<InsightRunRecord[]> {
  const docs = await ctx.db
    .query("insightRuns")
    .withIndex("by_workspace_created_at", (q) =>
      q.eq("workspaceId", workspaceDocId),
    )
    .order("desc")
    .take(limit);

  return docs.map(docToInsightRun);
}

export async function listFindingsForRun(
  ctx: DbReadCtx,
  runId: Id<"insightRuns">,
): Promise<InsightFindingRecord[]> {
  const docs = await ctx.db
    .query("insightFindings")
    .withIndex("by_run", (q) => q.eq("runId", runId))
    .collect();

  return docs
    .map(docToInsightFinding)
    .sort((a, b) => {
      const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.createdAt - a.createdAt;
    });
}

export async function hydrateFindingEvidence(
  ctx: DbReadCtx,
  finding: InsightFindingRecord,
): Promise<InsightFindingDetail> {
  const events: InsightEvidenceEvent[] = [];
  for (const eventId of finding.evidenceEventIds ?? []) {
    const event = await ctx.db.get(eventId as Id<"events">);
    if (event) {
      const artifactIds = event.artifactIds ?? [];
      let primaryArtifactTitle: string | undefined;
      let primaryArtifactId: string | undefined;

      if (artifactIds.length > 0) {
        primaryArtifactId = artifactIds[0];
        const artifact = await ctx.db.get(artifactIds[0]!);
        primaryArtifactTitle = artifact?.title;
      }

      events.push({
        id: event._id,
        title: event.title,
        workstreamId: event.workstreamId,
        artifactIds: artifactIds.length > 0 ? artifactIds : undefined,
        artifactCount: artifactIds.length > 0 ? artifactIds.length : undefined,
        primaryArtifactId,
        primaryArtifactTitle,
      });
    }
  }

  const workstreams: InsightEvidenceWorkstream[] = [];
  for (const workstreamId of finding.evidenceWorkstreamIds ?? []) {
    const workstream = await ctx.db.get(workstreamId as Id<"workstreams">);
    if (workstream) {
      workstreams.push({
        id: workstream._id,
        title: workstream.title,
      });
    }
  }

  const excludeIds = new Set<string>([
    ...(finding.evidenceEventIds ?? []).map((id) => String(id)),
  ]);
  const relatedEventRecords = await getRelatedEventsForEvidence(
    ctx,
    (finding.evidenceEventIds ?? []) as Id<"events">[],
    excludeIds,
    5,
  );

  const relatedEvents: InsightEvidenceEvent[] = relatedEventRecords
    .filter((event): event is NonNullable<typeof event> => event !== undefined)
    .map((event) => ({
      id: event.id,
      title: event.title,
      workstreamId: event.workstreamId,
    }));

  return {
    ...finding,
    evidence: { events, workstreams, relatedEvents },
  };
}

export async function assertInsightRunAccess(
  ctx: DbReadCtx,
  runId: Id<"insightRuns">,
  userId: string,
): Promise<Doc<"insightRuns">> {
  const run = await ctx.db.get(runId);
  if (!run) {
    throw new Error("Insight run not found");
  }
  const workspace = await ctx.db.get(run.workspaceId);
  if (!workspace) {
    throw new Error("Insight run not found");
  }
  const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
  if (!membership) {
    throw new Error("Insight run not found");
  }
  return run;
}
