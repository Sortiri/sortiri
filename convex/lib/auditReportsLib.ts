import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type {
  AuditReportItemRecord,
  AuditReportRecord,
  AuditReportScope,
  AuditReportStatus,
} from "../../src/types/audit-reports";
import type { EvidenceSafetySummary } from "../../src/types/evidence-safety";
import { isReportImmutable } from "../../src/types/audit-reports";
import { canViewEvent } from "./authz";
import { docToEntity } from "./entitiesLib";
import { insertEvent, docToEvent, type EventRecord } from "./eventsLib";
import { docToInsightFinding } from "./insightRunsLib";
import { listFindingsForAnalysis } from "./impactAnalysesLib";
import { docToLesson } from "./lessonsLib";
import { docToPlaybook } from "./playbooksLib";
import type { AccessibleProjects } from "./projectAccessLib";
import {
  applySavedViewFilters,
  fetchWorkspaceEvents,
  loadSavedViewFilters,
} from "./savedViewEvents";
import type { SavedViewFilters } from "./viewFilters";
import { applyViewFilters } from "./viewFilters";
import { isArtifactSafeForAudit, isEventSafeForAudit } from "./sensitiveContent";
import { filterDecisionsByAccess } from "./decisionPermissions";
import { safeDecisionPreviewForAudit } from "./decisionContext";
import {
  filterIncidentsByAccess,
  filterObservabilitySignalsByAccess,
} from "./incidentPermissions";
import {
  safeIncidentPreviewForAudit,
  safeObservabilitySignalPreviewForAudit,
} from "./incidentContext";
import { getWorkspaceMembership } from "./authz";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type EvidenceCollectionResult = {
  events: EventRecord[];
  eventIds: Id<"events">[];
  workstreamIds: Id<"workstreams">[];
  artifactIds: Id<"artifacts">[];
  entityIds: Id<"entities">[];
  insightFindingIds: Id<"insightFindings">[];
  items: Array<{
    itemType: Doc<"auditReportItems">["itemType"];
    eventId?: Id<"events">;
    workstreamId?: Id<"workstreams">;
    artifactId?: Id<"artifacts">;
    entityId?: Id<"entities">;
    insightFindingId?: Id<"insightFindings">;
    impactAnalysisId?: Id<"impactAnalyses">;
    lessonId?: Id<"lessons">;
    playbookId?: Id<"playbooks">;
    decisionId?: Id<"decisions">;
    rollbackId?: Id<"rollbackEvents">;
    decisionCandidateId?: Id<"decisionCandidates">;
    incidentId?: Id<"incidents">;
    observabilitySignalId?: Id<"observabilitySignals">;
    title: string;
    summary?: string;
    reason?: string;
    order: number;
  }>;
  generatedSummary: string;
  safetySummary: EvidenceSafetySummary;
};

export function assertReportMutable(report: Doc<"auditReports">): void {
  if (isReportImmutable(report.status)) {
    throw new Error("Report is finalized and cannot be modified");
  }
}

export function docToAuditReport(
  doc: Doc<"auditReports">,
  workspaceExternalId: string,
  itemCount?: number,
): AuditReportRecord {
  return {
    id: doc._id,
    workspaceId: workspaceExternalId,
    title: doc.title,
    summary: doc.summary,
    status: doc.status,
    scope: {
      projectIds: doc.scope.projectIds?.map(String),
      viewId: doc.scope.viewId ? String(doc.scope.viewId) : undefined,
      entityIds: doc.scope.entityIds?.map(String),
      impactAnalysisId: doc.scope.impactAnalysisId
        ? String(doc.scope.impactAnalysisId)
        : undefined,
      lessonIds: doc.scope.lessonIds?.map(String),
      playbookIds: doc.scope.playbookIds?.map(String),
      windowStart: doc.scope.windowStart,
      windowEnd: doc.scope.windowEnd,
      categories: doc.scope.categories,
      sources: doc.scope.sources,
      visibility: doc.scope.visibility,
    },
    snapshotEventIds: doc.snapshotEventIds?.map(String),
    snapshotWorkstreamIds: doc.snapshotWorkstreamIds?.map(String),
    snapshotArtifactIds: doc.snapshotArtifactIds?.map(String),
    snapshotEntityIds: doc.snapshotEntityIds?.map(String),
    generatedSummary: doc.generatedSummary,
    createdBy: doc.createdBy,
    finalizedAt: doc.finalizedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    safetySummary: doc.safetySummary,
    itemCount,
  };
}

export function docToAuditReportItem(
  doc: Doc<"auditReportItems">,
  workspaceExternalId: string,
): AuditReportItemRecord {
  return {
    id: doc._id,
    workspaceId: workspaceExternalId,
    reportId: doc.reportId,
    itemType: doc.itemType,
    eventId: doc.eventId ? String(doc.eventId) : undefined,
    workstreamId: doc.workstreamId ? String(doc.workstreamId) : undefined,
    artifactId: doc.artifactId ? String(doc.artifactId) : undefined,
    entityId: doc.entityId ? String(doc.entityId) : undefined,
    insightFindingId: doc.insightFindingId ? String(doc.insightFindingId) : undefined,
    impactAnalysisId: doc.impactAnalysisId ? String(doc.impactAnalysisId) : undefined,
    lessonId: doc.lessonId ? String(doc.lessonId) : undefined,
    playbookId: doc.playbookId ? String(doc.playbookId) : undefined,
    decisionId: doc.decisionId ? String(doc.decisionId) : undefined,
    rollbackId: doc.rollbackId ? String(doc.rollbackId) : undefined,
    decisionCandidateId: doc.decisionCandidateId
      ? String(doc.decisionCandidateId)
      : undefined,
    incidentId: doc.incidentId ? String(doc.incidentId) : undefined,
    observabilitySignalId: doc.observabilitySignalId
      ? String(doc.observabilitySignalId)
      : undefined,
    title: doc.title,
    summary: doc.summary,
    reason: doc.reason,
    order: doc.order,
    createdAt: doc.createdAt,
  };
}

export function scopeToSavedViewFilters(
  scope: Doc<"auditReports">["scope"],
): SavedViewFilters {
  return {
    projectIds: scope.projectIds,
    categories: scope.categories as SavedViewFilters["categories"],
    sources: scope.sources,
    entityIds: scope.entityIds,
    visibility: scope.visibility ?? "primary",
  };
}

export async function collectEventsForReportScope(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  scope: Doc<"auditReports">["scope"],
  accessible: AccessibleProjects,
  clerkUserId?: string,
): Promise<EventRecord[]> {
  const windowStart = scope.windowStart;
  const windowEnd = scope.windowEnd;
  const scanLimit = 2000;

  let events: EventRecord[];

  if (scope.viewId && clerkUserId) {
    const filters = await loadSavedViewFilters(ctx, scope.viewId, workspaceId, clerkUserId);
    if (!filters) {
      return [];
    }
    events = await applySavedViewFilters(ctx, workspaceId, filters, {
      windowStart,
      scanLimit,
      accessibleProjects: accessible,
    });
  } else {
    const filters = scopeToSavedViewFilters(scope);
    events = await fetchWorkspaceEvents(ctx, workspaceId, {
      scanLimit,
      windowStart,
    });
    events = events.filter((event) => canViewEvent(event, accessible));
    events = applyViewFilters(events, filters);
  }

  if (windowEnd !== undefined) {
    events = events.filter((event) => event.occurredAt <= windowEnd);
  }

  return events;
}

export async function collectEvidenceFromImpactAnalysis(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  impactAnalysisId: Id<"impactAnalyses">,
  accessible: AccessibleProjects,
): Promise<EvidenceCollectionResult> {
  const analysis = await ctx.db.get(impactAnalysisId);
  if (!analysis || analysis.workspaceId !== workspaceId) {
    throw new Error("Impact analysis not found");
  }

  const findings = await listFindingsForAnalysis(ctx, impactAnalysisId);
  const eventIdSet = new Set<Id<"events">>();
  const workstreamIdSet = new Set<Id<"workstreams">>();
  const entityIdSet = new Set<Id<"entities">>();

  for (const finding of findings) {
    for (const eventId of finding.evidenceEventIds ?? []) {
      eventIdSet.add(eventId as Id<"events">);
    }
    for (const workstreamId of finding.evidenceWorkstreamIds ?? []) {
      workstreamIdSet.add(workstreamId as Id<"workstreams">);
    }
    for (const entityId of finding.evidenceEntityIds ?? []) {
      entityIdSet.add(entityId as Id<"entities">);
    }
  }

  let excludedEvents = 0;
  let needsReview = 0;
  let blocked = 0;
  let excludedArtifactLinks = false;

  const events: EventRecord[] = [];
  for (const eventId of eventIdSet) {
    const doc = await ctx.db.get(eventId);
    if (!doc || doc.workspaceId !== workspaceId) continue;
    const event = docToEvent(doc);
    if (!canViewEvent(event, accessible)) {
      excludedEvents += 1;
      continue;
    }
    if (event.safeForAudit === false || !isEventSafeForAudit(event)) {
      excludedEvents += 1;
      if (event.redactionStatus === "blocked") blocked += 1;
      else if (event.redactionStatus === "needs_review") needsReview += 1;
      continue;
    }

    if (event.artifactIds?.length) {
      const safeArtifactIds: string[] = [];
      for (const artifactId of event.artifactIds) {
        const artifactDoc = await ctx.db.get(artifactId as Id<"artifacts">);
        if (!artifactDoc || !isArtifactSafeForAudit(artifactDoc)) {
          excludedArtifactLinks = true;
          continue;
        }
        safeArtifactIds.push(artifactId);
      }
      events.push({ ...event, artifactIds: safeArtifactIds });
    } else {
      events.push(event);
    }
  }

  const eventIds = events.map((event) => event.id as Id<"events">);
  const artifactIdSet = new Set<Id<"artifacts">>();
  for (const event of events) {
    if (event.workstreamId) {
      workstreamIdSet.add(event.workstreamId as Id<"workstreams">);
    }
    for (const artifactId of event.artifactIds ?? []) {
      artifactIdSet.add(artifactId as Id<"artifacts">);
    }
  }

  let excludedArtifacts = 0;
  const safeArtifactIdSet = new Set<Id<"artifacts">>();
  for (const artifactId of artifactIdSet) {
    const doc = await ctx.db.get(artifactId);
    if (!doc || !isArtifactSafeForAudit(doc)) {
      excludedArtifacts += 1;
      continue;
    }
    safeArtifactIdSet.add(artifactId);
  }

  const items: EvidenceCollectionResult["items"] = [];
  let order = 0;

  if (analysis.generatedSummary) {
    items.push({
      itemType: "note",
      title: `Impact analysis: ${analysis.title}`,
      summary: analysis.generatedSummary,
      reason: "Impact analysis summary included as context note.",
      order: order++,
    });
  }

  for (const event of events.slice(0, 200)) {
    items.push({
      itemType: "event",
      eventId: event.id as Id<"events">,
      title: event.title ?? event.type,
      summary: event.summary,
      reason: "Event included from impact analysis evidence.",
      order: order++,
    });
  }

  for (const workstreamId of workstreamIdSet) {
    const doc = await ctx.db.get(workstreamId);
    if (!doc) continue;
    items.push({
      itemType: "workstream",
      workstreamId,
      title: doc.title,
      summary: doc.summary,
      reason: "Workstream referenced in impact analysis findings.",
      order: order++,
    });
  }

  for (const artifactId of safeArtifactIdSet) {
    const doc = await ctx.db.get(artifactId);
    if (!doc) continue;
    items.push({
      itemType: "artifact",
      artifactId,
      title: doc.title,
      summary: doc.summary,
      reason: "Artifact attached to impact analysis evidence.",
      order: order++,
    });
  }

  for (const entityId of entityIdSet) {
    const doc = await ctx.db.get(entityId);
    if (!doc) continue;
    items.push({
      itemType: "entity",
      entityId,
      title: doc.name,
      summary: undefined,
      reason: "Entity referenced in impact analysis findings.",
      order: order++,
    });
  }

  const generatedSummary = analysis.generatedSummary
    ? `Evidence collected from impact analysis "${analysis.title}". ${events.length} events, ${workstreamIdSet.size} workstreams. Correlation only — not causation.`
    : `Evidence collected from impact analysis "${analysis.title}".`;

  return {
    events,
    eventIds,
    workstreamIds: [...workstreamIdSet],
    artifactIds: [...safeArtifactIdSet],
    entityIds: [...entityIdSet],
    insightFindingIds: [],
    items,
    generatedSummary,
    safetySummary: {
      includedItems: items.length,
      excludedEvents,
      excludedArtifacts,
      needsReview,
      blocked,
    },
  };
}

export async function collectEvidenceFromLessons(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  lessonIds: Id<"lessons">[],
  accessible: AccessibleProjects,
): Promise<EvidenceCollectionResult> {
  const eventIdSet = new Set<Id<"events">>();
  const workstreamIdSet = new Set<Id<"workstreams">>();
  let excludedEvents = 0;
  let blocked = 0;
  let needsReview = 0;

  const items: EvidenceCollectionResult["items"] = [];
  let order = 0;

  for (const lessonId of lessonIds) {
    const lessonDoc = await ctx.db.get(lessonId);
    if (!lessonDoc || lessonDoc.workspaceId !== workspaceId) continue;
    const lesson = docToLesson(lessonDoc);

    items.push({
      itemType: "lesson",
      lessonId,
      title: lesson.title,
      summary: [lesson.summary, lesson.recommendation].filter(Boolean).join("\n\n"),
      reason: "Lesson included in audit scope.",
      order: order++,
    });

    for (const eventId of lesson.evidenceEventIds ?? []) {
      eventIdSet.add(eventId as Id<"events">);
    }
    for (const workstreamId of lesson.evidenceWorkstreamIds ?? []) {
      workstreamIdSet.add(workstreamId as Id<"workstreams">);
    }
  }

  const events: EventRecord[] = [];
  for (const eventId of eventIdSet) {
    const doc = await ctx.db.get(eventId);
    if (!doc || doc.workspaceId !== workspaceId) continue;
    const event = docToEvent(doc);
    if (!canViewEvent(event, accessible)) {
      excludedEvents += 1;
      continue;
    }
    if (!isEventSafeForAudit(event)) {
      excludedEvents += 1;
      if (event.redactionStatus === "blocked") blocked += 1;
      else if (event.redactionStatus === "needs_review") needsReview += 1;
      items.push({
        itemType: "note",
        title: `Excluded event: ${event.title}`,
        summary: "Event excluded from audit due to safety or permission rules.",
        reason: "Redaction exclusion",
        order: order++,
      });
      continue;
    }
    events.push(event);
    items.push({
      itemType: "event",
      eventId,
      title: event.title ?? event.type,
      summary: event.summary,
      reason: "Event linked from lesson evidence.",
      order: order++,
    });
  }

  return {
    events,
    eventIds: events.map((e) => e.id as Id<"events">),
    workstreamIds: [...workstreamIdSet],
    artifactIds: [],
    entityIds: [],
    insightFindingIds: [],
    items,
    generatedSummary: `Evidence collected from ${lessonIds.length} lesson(s). Correlation only — not causation.`,
    safetySummary: {
      includedItems: items.length,
      excludedEvents,
      excludedArtifacts: 0,
      needsReview,
      blocked,
    },
  };
}

export async function collectEvidenceFromPlaybooks(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  playbookIds: Id<"playbooks">[],
  accessible: AccessibleProjects,
): Promise<EvidenceCollectionResult> {
  const items: EvidenceCollectionResult["items"] = [];
  let order = 0;
  const lessonIds: Id<"lessons">[] = [];

  for (const playbookId of playbookIds) {
    const playbookDoc = await ctx.db.get(playbookId);
    if (!playbookDoc || playbookDoc.workspaceId !== workspaceId) continue;
    const playbook = docToPlaybook(playbookDoc);

    const stepsText = playbook.steps
      .map((step, index) => `${step.order ?? index + 1}. ${step.title}`)
      .join("\n");

    items.push({
      itemType: "playbook",
      playbookId,
      title: playbook.title,
      summary: [playbook.summary, stepsText].filter(Boolean).join("\n\n"),
      reason: "Playbook included in audit scope.",
      order: order++,
    });

    for (const lessonId of playbook.lessonIds ?? []) {
      lessonIds.push(lessonId as Id<"lessons">);
    }
  }

  if (lessonIds.length > 0) {
    const lessonEvidence = await collectEvidenceFromLessons(
      ctx,
      workspaceId,
      [...new Set(lessonIds)],
      accessible,
    );
    for (const item of lessonEvidence.items) {
      items.push({ ...item, order: order++ });
    }
    return {
      ...lessonEvidence,
      items,
      generatedSummary: `Evidence collected from ${playbookIds.length} playbook(s) and related lessons.`,
    };
  }

  return {
    events: [],
    eventIds: [],
    workstreamIds: [],
    artifactIds: [],
    entityIds: [],
    insightFindingIds: [],
    items,
    generatedSummary: `Playbook scope with ${playbookIds.length} playbook(s).`,
    safetySummary: {
      includedItems: items.length,
      excludedEvents: 0,
      excludedArtifacts: 0,
      needsReview: 0,
      blocked: 0,
    },
  };
}

export async function collectEvidenceFromScope(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  scope: Doc<"auditReports">["scope"],
  accessible: AccessibleProjects,
  clerkUserId?: string,
): Promise<EvidenceCollectionResult> {
  if (scope.impactAnalysisId) {
    return collectEvidenceFromImpactAnalysis(
      ctx,
      workspaceId,
      scope.impactAnalysisId,
      accessible,
    );
  }

  if (scope.lessonIds?.length) {
    return collectEvidenceFromLessons(ctx, workspaceId, scope.lessonIds, accessible);
  }

  if (scope.playbookIds?.length) {
    return collectEvidenceFromPlaybooks(ctx, workspaceId, scope.playbookIds, accessible);
  }

  const allEvents = await collectEventsForReportScope(
    ctx,
    workspaceId,
    scope,
    accessible,
    clerkUserId,
  );

  let excludedEvents = 0;
  let needsReview = 0;
  let blocked = 0;
  let excludedArtifactLinks = false;

  const events: EventRecord[] = [];
  for (const event of allEvents) {
    if (event.safeForAudit === false || !isEventSafeForAudit(event)) {
      excludedEvents += 1;
      if (event.redactionStatus === "blocked") blocked += 1;
      else if (event.redactionStatus === "needs_review") needsReview += 1;
      continue;
    }

    if (event.artifactIds?.length) {
      const safeArtifactIds: string[] = [];
      for (const artifactId of event.artifactIds) {
        const artifactDoc = await ctx.db.get(artifactId as Id<"artifacts">);
        if (!artifactDoc || !isArtifactSafeForAudit(artifactDoc)) {
          excludedArtifactLinks = true;
          if (artifactDoc?.redactionStatus === "blocked") blocked += 1;
          else if (artifactDoc?.redactionStatus === "needs_review") needsReview += 1;
          continue;
        }
        safeArtifactIds.push(artifactId);
      }
      events.push({ ...event, artifactIds: safeArtifactIds });
    } else {
      events.push(event);
    }
  }

  const eventIds = events.map((event) => event.id as Id<"events">);
  const eventIdSet = new Set(eventIds);

  const workstreamIdSet = new Set<Id<"workstreams">>();
  for (const event of events) {
    if (event.workstreamId) {
      workstreamIdSet.add(event.workstreamId as Id<"workstreams">);
    }
  }

  const artifactIdSet = new Set<Id<"artifacts">>();
  for (const event of events) {
    if (event.artifactIds) {
      for (const artifactId of event.artifactIds) {
        artifactIdSet.add(artifactId as Id<"artifacts">);
      }
    }
  }

  for (const workstreamId of workstreamIdSet) {
    const artifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_workstream", (q) => q.eq("workstreamId", workstreamId))
      .collect();
    for (const artifact of artifacts) {
      artifactIdSet.add(artifact._id);
    }
  }

  let excludedArtifacts = 0;
  const safeArtifactIdSet = new Set<Id<"artifacts">>();
  for (const artifactId of artifactIdSet) {
    const doc = await ctx.db.get(artifactId);
    if (!doc || !isArtifactSafeForAudit(doc)) {
      excludedArtifacts += 1;
      if (doc?.redactionStatus === "blocked") blocked += 1;
      else if (doc?.redactionStatus === "needs_review") needsReview += 1;
      continue;
    }
    safeArtifactIdSet.add(artifactId);
  }

  const entityIdSet = new Set<Id<"entities">>();
  if (scope.entityIds) {
    for (const entityId of scope.entityIds) {
      entityIdSet.add(entityId);
    }
  }
  for (const event of events) {
    if (!event.entity?.type) continue;
    const docs = await ctx.db
      .query("entities")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
    for (const doc of docs) {
      const record = docToEntity(doc);
      if (
        record.type === event.entity.type &&
        (record.key === event.entity.id || record.key === event.entity.name)
      ) {
        entityIdSet.add(doc._id);
      }
    }
  }

  const insightFindingIds = new Set<Id<"insightFindings">>();
  const findings = await ctx.db
    .query("insightFindings")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  for (const finding of findings) {
    const eventEvidence = finding.evidenceEventIds ?? [];
    const wsEvidence = finding.evidenceWorkstreamIds ?? [];
    const overlaps =
      eventEvidence.some((id) => eventIdSet.has(id)) ||
      wsEvidence.some((id) => workstreamIdSet.has(id));
    if (overlaps) {
      insightFindingIds.add(finding._id);
    }
  }

  const items: EvidenceCollectionResult["items"] = [];
  let order = 0;

  for (const event of events.slice(0, 200)) {
    items.push({
      itemType: "event",
      eventId: event.id as Id<"events">,
      title: event.title ?? event.type,
      summary: event.summary,
      reason: "Event matched report scope and time window.",
      order: order++,
    });
  }

  for (const workstreamId of workstreamIdSet) {
    const doc = await ctx.db.get(workstreamId);
    if (!doc) continue;
    items.push({
      itemType: "workstream",
      workstreamId,
      title: doc.title,
      summary: doc.summary,
      reason: "Workstream contained included timeline events.",
      order: order++,
    });
  }

  for (const artifactId of safeArtifactIdSet) {
    const doc = await ctx.db.get(artifactId);
    if (!doc) continue;
    items.push({
      itemType: "artifact",
      artifactId,
      title: doc.title,
      summary: doc.summary,
      reason: "Artifact attached to an included event or workstream.",
      order: order++,
    });
  }

  if (excludedArtifactLinks) {
    items.push({
      itemType: "note",
      title: "Some attached artifacts were excluded",
      summary:
        "Some attached artifacts were excluded because they require evidence review.",
      reason: "Unsafe artifacts were omitted from this audit report.",
      order: order++,
    });
  }

  for (const entityId of entityIdSet) {
    const doc = await ctx.db.get(entityId);
    if (!doc) continue;
    items.push({
      itemType: "entity",
      entityId,
      title: doc.name,
      summary: doc.type,
      reason: "Entity referenced by included timeline events.",
      order: order++,
    });
  }

  for (const findingId of insightFindingIds) {
    const doc = await ctx.db.get(findingId);
    if (!doc) continue;
    const finding = docToInsightFinding(doc);
    items.push({
      itemType: "insight",
      insightFindingId: findingId,
      title: finding.title,
      summary: finding.summary,
      reason: "Insight finding referenced included evidence.",
      order: order++,
    });
  }

  const windowStart = scope.windowStart ?? 0;
  const windowEnd = scope.windowEnd ?? Date.now();
  const role = clerkUserId
    ? ((await getWorkspaceMembership(ctx, workspaceId, clerkUserId))?.role ?? "member")
    : "member";

  const decisionDocs = await ctx.db
    .query("decisions")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const scopedDecisions = filterDecisionsByAccess(
    decisionDocs.filter((d) => {
      if (d.status === "archived") return false;
      if (d.decidedAt < windowStart || d.decidedAt > windowEnd) return false;
      if (
        scope.projectIds?.length &&
        d.projectId &&
        !scope.projectIds.includes(d.projectId)
      ) {
        return false;
      }
      return true;
    }),
    accessible,
    role,
  );

  for (const decision of scopedDecisions.slice(0, 20)) {
    const preview = safeDecisionPreviewForAudit(decision);
    items.push({
      itemType: "decision",
      decisionId: decision._id,
      title: preview.title,
      summary: preview.summary,
      reason: "Decision recorded within report scope and time window.",
      order: order++,
    });
  }

  const rollbackDocs = await ctx.db
    .query("rollbackEvents")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  for (const rollback of rollbackDocs.filter((r) => {
    if (r.rolledBackAt < windowStart || r.rolledBackAt > windowEnd) return false;
    if (
      scope.projectIds?.length &&
      r.projectId &&
      !scope.projectIds.includes(r.projectId)
    ) {
      return false;
    }
    return true;
  }).slice(0, 10)) {
    items.push({
      itemType: "rollback",
      rollbackId: rollback._id,
      title: rollback.title,
      summary: rollback.summary ?? rollback.reason,
      reason: "Rollback recorded within report scope and time window.",
      order: order++,
    });
  }

  const candidateDocs = await ctx.db
    .query("decisionCandidates")
    .withIndex("by_workspace_status", (q) =>
      q.eq("workspaceId", workspaceId).eq("status", "pending"),
    )
    .collect();

  for (const candidate of candidateDocs.filter((c) => {
    if (c.createdAt < windowStart || c.createdAt > windowEnd) return false;
    if (
      scope.projectIds?.length &&
      c.projectId &&
      !scope.projectIds.includes(c.projectId)
    ) {
      return false;
    }
    return true;
  }).slice(0, 10)) {
    items.push({
      itemType: "decision_candidate",
      decisionCandidateId: candidate._id,
      title: candidate.title,
      summary: candidate.summary,
      reason: "Pending decision candidate in scope (redacted preview only).",
      order: order++,
    });
  }

  const incidentDocs = await ctx.db
    .query("incidents")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const scopedIncidents = filterIncidentsByAccess(
    incidentDocs.filter((i) => {
      if (i.status === "archived") return false;
      if (i.startedAt < windowStart || i.startedAt > windowEnd) return false;
      if (
        scope.projectIds?.length &&
        i.projectId &&
        !scope.projectIds.includes(i.projectId)
      ) {
        return false;
      }
      return true;
    }),
    accessible,
    role,
  );

  for (const incident of scopedIncidents.slice(0, 20)) {
    const preview = safeIncidentPreviewForAudit(incident);
    items.push({
      itemType: "incident",
      incidentId: incident._id,
      title: preview.title,
      summary: preview.summary,
      reason: "Incident recorded within report scope and time window.",
      order: order++,
    });
  }

  const signalDocs = await ctx.db
    .query("observabilitySignals")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const scopedSignals = filterObservabilitySignalsByAccess(
    signalDocs.filter((s) => {
      if (s.occurredAt < windowStart || s.occurredAt > windowEnd) return false;
      if (
        scope.projectIds?.length &&
        s.projectId &&
        !scope.projectIds.includes(s.projectId)
      ) {
        return false;
      }
      return true;
    }),
    accessible,
    role,
  );

  for (const signal of scopedSignals.slice(0, 20)) {
    const preview = safeObservabilitySignalPreviewForAudit(signal);
    items.push({
      itemType: "observability_signal",
      observabilitySignalId: signal._id,
      incidentId: signal.incidentId,
      title: preview.title,
      summary: preview.summary,
      reason: "Observability signal in scope (redacted preview only).",
      order: order++,
    });
  }

  const generatedSummary = buildDeterministicSummary({
    eventCount: eventIds.length,
    workstreamCount: workstreamIdSet.size,
    artifactCount: safeArtifactIdSet.size,
    entityCount: entityIdSet.size,
    insightCount: insightFindingIds.size,
  });

  const safetySummary: EvidenceSafetySummary = {
    includedItems: items.length,
    excludedArtifacts,
    excludedEvents,
    needsReview,
    blocked,
  };

  return {
    events,
    eventIds,
    workstreamIds: Array.from(workstreamIdSet),
    artifactIds: Array.from(safeArtifactIdSet),
    entityIds: Array.from(entityIdSet),
    insightFindingIds: Array.from(insightFindingIds),
    items,
    generatedSummary,
    safetySummary,
  };
}

function buildDeterministicSummary(counts: {
  eventCount: number;
  workstreamCount: number;
  artifactCount: number;
  entityCount: number;
  insightCount: number;
}): string {
  return [
    `This audit report includes ${counts.eventCount} events, ${counts.workstreamCount} workstreams, ${counts.artifactCount} artifacts, ${counts.entityCount} entities, and ${counts.insightCount} insight findings.`,
    "Evidence was selected from the configured scope and frozen at generation time.",
  ].join(" ");
}

export async function replaceReportItems(
  ctx: DbWriteCtx,
  reportId: Id<"auditReports">,
  workspaceId: Id<"workspaces">,
  items: EvidenceCollectionResult["items"],
): Promise<void> {
  const existing = await ctx.db
    .query("auditReportItems")
    .withIndex("by_report", (q) => q.eq("reportId", reportId))
    .collect();
  for (const row of existing) {
    await ctx.db.delete(row._id);
  }

  const now = Date.now();
  for (const item of items) {
    await ctx.db.insert("auditReportItems", {
      workspaceId,
      reportId,
      itemType: item.itemType,
      eventId: item.eventId,
      workstreamId: item.workstreamId,
      artifactId: item.artifactId,
      entityId: item.entityId,
      insightFindingId: item.insightFindingId,
      impactAnalysisId: item.impactAnalysisId,
      lessonId: item.lessonId,
      playbookId: item.playbookId,
      decisionId: item.decisionId,
      rollbackId: item.rollbackId,
      decisionCandidateId: item.decisionCandidateId,
      incidentId: item.incidentId,
      observabilitySignalId: item.observabilitySignalId,
      title: item.title,
      summary: item.summary,
      reason: item.reason,
      order: item.order,
      createdAt: now,
    });
  }
}

export async function recordAuditReportEvent(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    reportId: Id<"auditReports">;
    type:
      | "audit_report.created"
      | "audit_report.evidence_generated"
      | "audit_report.finalized"
      | "audit_report.access_granted"
      | "audit_report.access_revoked"
      | "audit_report.viewed_by_auditor"
      | "audit_share_link.created"
      | "audit_share_link.revoked"
      | "audit_report.exported"
      | "audit_report.shared_viewed";
    title: string;
    summary: string;
    actor: Parameters<typeof insertEvent>[1]["actor"];
  },
): Promise<void> {
  const report = await ctx.db.get(input.reportId);
  await insertEvent(ctx, {
    workspaceId: input.workspaceId,
    source: "system",
    category: "system_event",
    type: input.type,
    actor: input.actor,
    title: input.title,
    summary: input.summary,
    entity: report
      ? { type: "project", name: report.title, id: input.reportId }
      : undefined,
    visibility: "primary",
    importance: "normal",
    occurredAt: Date.now(),
  });
}

export function isIdInReportSnapshot(
  report: Doc<"auditReports">,
  kind: "event" | "workstream" | "artifact" | "entity",
  id: string,
): boolean {
  switch (kind) {
    case "event":
      return (report.snapshotEventIds ?? []).some((row) => String(row) === id);
    case "workstream":
      return (report.snapshotWorkstreamIds ?? []).some((row) => String(row) === id);
    case "artifact":
      return (report.snapshotArtifactIds ?? []).some((row) => String(row) === id);
    case "entity":
      return (report.snapshotEntityIds ?? []).some((row) => String(row) === id);
    default:
      return false;
  }
}

export async function isArtifactInReportSnapshot(
  ctx: DbReadCtx,
  reportId: Id<"auditReports">,
  artifactId: Id<"artifacts">,
): Promise<boolean> {
  const report = await ctx.db.get(reportId);
  if (!report) return false;
  return isIdInReportSnapshot(report, "artifact", artifactId);
}
