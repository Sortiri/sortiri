import type { Doc, Id } from "../_generated/dataModel";
import type { ImpactFindingRecord } from "./impactAnalysesLib";
import {
  buildLessonRecommendationFromFinding,
  buildLessonSummaryFromFinding,
  buildLessonTitleFromFinding,
  buildSecurityLessonCopy,
  buildValidationLessonCopy,
  validateLessonCopy,
} from "./lessonCopy";
import type { LessonInput } from "./lessonsLib";

export function impactFindingDedupTag(findingId: string): string {
  return `impact-finding:${findingId}`;
}

function mapFindingTypeToLessonType(
  findingType: Doc<"impactFindings">["type"],
): Doc<"lessons">["type"] {
  switch (findingType) {
    case "product_movement":
    case "activation_movement":
    case "feature_usage":
      return "product_learning";
    case "revenue_movement":
    case "payment_activity":
      return "revenue_learning";
    case "customer_activity":
      return "product_learning";
    case "negative_signal":
      return "negative_pattern";
    case "related_work":
      return "process_learning";
    case "risk":
      return "risk";
    default:
      return "other";
  }
}

function mapFindingToImportance(
  finding: ImpactFindingRecord,
): Doc<"lessons">["importance"] {
  if (finding.severity === "critical") return "critical";
  if (finding.type === "negative_signal" || finding.type === "risk") return "high";
  if (finding.severity === "warning") return "normal";
  return "low";
}

function mapFindingToConfidence(
  finding: ImpactFindingRecord,
): Doc<"lessons">["confidence"] {
  if (finding.type === "negative_signal") return "possible";
  return finding.confidence;
}

export function lessonFromImpactFinding(
  finding: ImpactFindingRecord,
  context: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    viewId?: Id<"savedViews">;
    impactAnalysisId: Id<"impactAnalyses">;
  },
): LessonInput {
  const title = buildLessonTitleFromFinding(finding);
  const summary = buildLessonSummaryFromFinding(finding);
  const recommendation = buildLessonRecommendationFromFinding(finding);
  validateLessonCopy({ title, summary, recommendation });

  return {
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    viewId: context.viewId,
    impactAnalysisId: context.impactAnalysisId,
    title,
    summary,
    type: mapFindingTypeToLessonType(finding.type),
    status: "active",
    confidence: mapFindingToConfidence(finding),
    importance: mapFindingToImportance(finding),
    source: "impact_analysis",
    recommendation,
    evidenceEventIds: finding.evidenceEventIds as Id<"events">[] | undefined,
    evidenceWorkstreamIds: finding.evidenceWorkstreamIds as
      | Id<"workstreams">[]
      | undefined,
    evidenceEntityIds: finding.evidenceEntityIds as Id<"entities">[] | undefined,
    evidenceArtifactIds: finding.evidenceArtifactIds as Id<"artifacts">[] | undefined,
    evidenceImpactAnalysisIds: [context.impactAnalysisId],
    tags: [impactFindingDedupTag(finding.id)],
  };
}

export function lessonFromFailurePattern(input: {
  workspaceId: Id<"workspaces">;
  failureType: string;
  count: number;
  windowDays: number;
  evidenceEventIds?: Id<"events">[];
}): LessonInput {
  const copy = buildValidationLessonCopy(input);
  validateLessonCopy(copy);
  return {
    workspaceId: input.workspaceId,
    title: copy.title,
    summary: copy.summary,
    type: input.failureType.includes("security") ? "negative_pattern" : "validation",
    status: "active",
    confidence: "likely",
    importance: "high",
    source: "failure_pattern",
    recommendation: copy.recommendation,
    evidenceEventIds: input.evidenceEventIds,
    tags: [`failure-pattern:${input.failureType}`],
  };
}

export function lessonFromSecurityEvidence(input: {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  impactAnalysisId?: Id<"impactAnalyses">;
  evidenceArtifactIds?: Id<"artifacts">[];
  evidenceEventIds?: Id<"events">[];
}): LessonInput {
  const copy = buildSecurityLessonCopy();
  validateLessonCopy(copy);
  return {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    impactAnalysisId: input.impactAnalysisId,
    title: copy.title,
    summary: copy.summary,
    type: "security_learning",
    status: "active",
    confidence: "likely",
    importance: "high",
    source: "impact_analysis",
    recommendation: copy.recommendation,
    evidenceArtifactIds: input.evidenceArtifactIds,
    evidenceEventIds: input.evidenceEventIds,
    evidenceImpactAnalysisIds: input.impactAnalysisId
      ? [input.impactAnalysisId]
      : undefined,
    tags: ["security-evidence"],
  };
}

export function lessonFromInsightFinding(input: {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  insightFindingId: Id<"insightFindings">;
  title: string;
  summary: string;
  recommendation?: string;
  type?: Doc<"lessons">["type"];
}): LessonInput {
  validateLessonCopy({
    title: input.title,
    summary: input.summary,
    recommendation: input.recommendation,
  });
  return {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    title: input.title,
    summary: input.summary,
    type: input.type ?? "other",
    status: "active",
    confidence: "possible",
    importance: "normal",
    source: "insight",
    recommendation: input.recommendation,
    evidenceInsightFindingIds: [input.insightFindingId],
    tags: [`insight-finding:${input.insightFindingId}`],
  };
}

export async function scanSecurityLessonsFromArtifacts(
  ctx: { db: { get: (id: Id<"artifacts">) => Promise<Doc<"artifacts"> | null> } },
  artifactIds: Id<"artifacts">[],
  context: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    impactAnalysisId: Id<"impactAnalyses">;
  },
): Promise<LessonInput | null> {
  const blocked: Id<"artifacts">[] = [];
  for (const artifactId of artifactIds) {
    const artifact = await ctx.db.get(artifactId);
    if (
      artifact &&
      (artifact.redactionStatus === "blocked" || artifact.safeForAudit === false)
    ) {
      blocked.push(artifactId);
    }
  }
  if (blocked.length === 0) return null;
  return lessonFromSecurityEvidence({
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    impactAnalysisId: context.impactAnalysisId,
    evidenceArtifactIds: blocked,
  });
}

export async function scanValidationLessonsFromEvents(
  eventTypes: string[],
  context: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    impactAnalysisId: Id<"impactAnalyses">;
    evidenceEventIds: Id<"events">[];
  },
): Promise<LessonInput | null> {
  const failureTypes = eventTypes.filter(
    (t) =>
      t === "command.failed" ||
      t === "build.failed" ||
      (t.includes("webhook") && t.includes("fail")),
  );
  if (failureTypes.length === 0) return null;
  const copy = buildValidationLessonCopy({
    failureType: failureTypes[0]!,
    count: failureTypes.length,
    windowDays: 7,
  });
  validateLessonCopy(copy);
  return {
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    impactAnalysisId: context.impactAnalysisId,
    title: copy.title,
    summary: copy.summary,
    type: "validation",
    status: "active",
    confidence: "possible",
    importance: "normal",
    source: "impact_analysis",
    recommendation: copy.recommendation,
    evidenceEventIds: context.evidenceEventIds,
    evidenceImpactAnalysisIds: [context.impactAnalysisId],
    tags: ["validation-from-evidence"],
  };
}

export function lessonFromDecisionContext(input: {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  decisionId: Id<"decisions">;
  title: string;
  summary: string;
  rollbackIds?: Id<"rollbackEvents">[];
  evidenceEventIds?: Id<"events">[];
}): LessonInput {
  validateLessonCopy({
    title: input.title,
    summary: input.summary,
    recommendation: "Review linked decision and rollback evidence before repeating this change.",
  });

  return {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    title: input.title,
    summary: input.summary,
    type: "process_learning",
    status: "active",
    confidence: "possible",
    importance: "normal",
    source: "system",
    recommendation:
      "Review linked decision and rollback evidence before repeating this change.",
    evidenceEventIds: input.evidenceEventIds,
    evidenceDecisionIds: [input.decisionId],
    evidenceRollbackIds: input.rollbackIds,
    tags: ["decision-memory"],
  };
}

export function lessonFromIncidentContext(input: {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  incidentId: Id<"incidents">;
  title: string;
  summary: string;
  rollbackIds?: Id<"rollbackEvents">[];
  evidenceEventIds?: Id<"events">[];
}): LessonInput {
  validateLessonCopy({
    title: input.title,
    summary: input.summary,
    recommendation:
      "Review linked incident, signal, and rollback evidence before repeating this change.",
  });

  return {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    title: input.title,
    summary: input.summary,
    type: "process_learning",
    status: "active",
    confidence: "possible",
    importance: "normal",
    source: "system",
    recommendation:
      "Review linked incident, signal, and rollback evidence before repeating this change.",
    evidenceEventIds: input.evidenceEventIds,
    evidenceIncidentIds: [input.incidentId],
    evidenceRollbackIds: input.rollbackIds,
    tags: ["incident-memory"],
  };
}
