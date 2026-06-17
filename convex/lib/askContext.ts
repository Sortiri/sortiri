import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  filterPrimaryEventRecords,
  questionRequestsDebugEvents,
} from "./eventDisplay";
import {
  docToEntity,
  getEntityTimelineEvents,
  searchEntitiesForWorkspace,
  type EntityRecord,
} from "./entitiesLib";
import {
  getConfidenceLabel,
  listLinksForEventIds,
  type LinkWithEvents,
} from "./eventLinksLib";
import {
  listEventsByWorkstream,
  listEventsForWorkspace,
  searchEventsForWorkspace,
  docToEvent,
  type EventRecord,
} from "./eventsLib";
import {
  listWorkstreamsForWorkspace,
  searchWorkstreamsForWorkspace,
  docToWorkstream,
  type WorkstreamRecord,
} from "./workstreamsLib";
import { listEntitiesByProject } from "./projectPulse";
import { docToProjectRecord } from "./projectsLib";
import { applySavedViewFilters } from "./savedViewEvents";
import { assertSavedViewAccess } from "./savedViewsLib";
import { getWorkspaceMembership, canViewEvent, canViewWorkstream, getMembershipAndAccessible } from "./authz";
import { getAccessibleProjectIds } from "./projectAccessLib";
import { listFindingsForAnalysis, docToImpactAnalysis } from "./impactAnalysesLib";
import { docToLesson } from "./lessonsLib";
import { docToPlaybook } from "./playbooksLib";
import { assertReportViewAccess } from "./auditReportAccessLib";
import { isEventSafeForAudit } from "./sensitiveContent";
import {
  docToContextPack,
  listItemsForContextPack,
  type ContextPackItemRecord,
} from "./contextPackLib";
import { formatContextPackText } from "./contextPackFormat";
import {
  docToRecommendation,
  filterRecommendationEvidence,
} from "./recommendationLib";
import {
  docToEvalRun,
  docToEvalSuite,
  filterEvalResultsEvidence,
  listEvalCasesForSuite,
  listEvalResultsForRun,
} from "./evalLib";
import {
  docToDeadLetterSummary,
  findDeadLetterById,
} from "./ingestDeadLetterLib";
import {
  docToIngestDeliverySummary,
  findDeliveryById,
} from "./ingestDeliveryLib";
import { assertDecisionRead } from "./decisionPermissions";
import { docToDecision } from "./decisionsLib";
import { docToRollback, listRollbacksForDecision } from "./rollbackEventsLib";
import { assertIncidentRead } from "./incidentPermissions";
import { docToIncident } from "./incidentsLib";
import {
  safeIncidentPreviewForAudit,
  safeObservabilitySignalPreviewForAudit,
} from "./incidentContext";
import { docToObservabilitySignal } from "./observabilitySignalsLib";

type DbReadCtx = Pick<QueryCtx, "db">;

type RetrieveAskContextOptions = {
  workstreamId?: Id<"workstreams">;
  entityId?: Id<"entities">;
  projectId?: Id<"projects">;
  viewId?: Id<"savedViews">;
  auditReportId?: Id<"auditReports">;
  impactAnalysisId?: Id<"impactAnalyses">;
  lessonId?: Id<"lessons">;
  playbookId?: Id<"playbooks">;
  contextPackId?: Id<"contextPacks">;
  recommendationId?: Id<"recommendations">;
  evalSuiteId?: Id<"evalSuites">;
  evalRunId?: Id<"evalRuns">;
  deliveryId?: Id<"ingestDeliveries">;
  deadLetterId?: Id<"ingestDeadLetters">;
  decisionId?: Id<"decisions">;
  incidentId?: Id<"incidents">;
  clerkUserId?: string;
};

export type AskContextResult = {
  contextText: string;
  eventIds: Id<"events">[];
  workstreamIds: Id<"workstreams">[];
  events: EventRecord[];
  workstreams: WorkstreamRecord[];
};

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function getActorName(actor: EventRecord["actor"]): string {
  return actor.name ?? actor.id ?? actor.type;
}

function isMetaAskEvent(event: EventRecord): boolean {
  if (event.type.startsWith("ask.")) return true;
  if (event.tags?.includes("meta")) return true;
  return false;
}

function filterAskContextEvents(events: EventRecord[]): EventRecord[] {
  return events.filter((event) => !isMetaAskEvent(event));
}

function filterSafeEventsForAsk(
  events: EventRecord[],
  role?: string,
): EventRecord[] {
  return events.filter((event) => {
    if (!isEventSafeForAudit(event)) return false;
    if (
      event.sensitivity === "restricted" &&
      role !== "owner" &&
      role !== "admin"
    ) {
      return false;
    }
    return true;
  });
}

export function formatAskContext(args: {
  events: EventRecord[];
  workstreams: WorkstreamRecord[];
  relatedLinks?: LinkWithEvents[];
  entityContexts?: Array<{ entity: EntityRecord; events: EventRecord[] }>;
  projectName?: string;
  viewName?: string;
  viewDescription?: string;
  auditReportTitle?: string;
}): string {
  const eventLines = args.events.map((event) => {
    const lines = [
      `[${event.id}]`,
      `Time: ${formatTimestamp(event.occurredAt)}`,
      `Category: ${event.category}`,
      `Source: ${event.source}`,
      `Actor: ${getActorName(event.actor)}`,
      `Title: ${event.title}`,
    ];
    if (event.summary) {
      lines.push(`Summary: ${event.summary}`);
    }
    if (event.visibility === "debug") {
      lines.push("Visibility: DEBUG");
    }
    if (event.workstreamId) {
      lines.push(`WorkstreamId: ${event.workstreamId}`);
    }
    return lines.join("\n");
  });

  const workstreamLines = args.workstreams.map((workstream) => {
    const lines = [
      `[${workstream.id}]`,
      `Title: ${workstream.title}`,
      `Status: ${workstream.status}`,
    ];
    if (workstream.summary) {
      lines.push(`Summary: ${workstream.summary}`);
    }
    return lines.join("\n");
  });

  const relatedLines =
    args.relatedLinks?.map((item) => {
      const fromTitle = item.fromEvent?.title ?? item.link.fromEventId ?? "Unknown";
      const toTitle = item.toEvent?.title ?? item.link.toEventId ?? "Unknown";
      const confidence = getConfidenceLabel(item.link.confidence);
      return [
        `Event [${item.link.fromEventId}] (${fromTitle}) → Event [${item.link.toEventId}] (${toTitle})`,
        `Type: ${item.link.type}`,
        `Reason: ${item.link.reason}`,
        `Confidence: ${confidence}`,
      ].join("\n");
    }) ?? [];

  const entityBlocks =
    args.entityContexts?.map(({ entity, events }) => {
      const lines = [
        `Entity: ${entity.name}`,
        `Type: ${entity.type}`,
        `Key: ${entity.key}`,
        "Events:",
        events.length > 0
          ? events
              .slice(0, 15)
              .map(
                (event) =>
                  `- [${formatTimestamp(event.occurredAt)}] ${event.title}`,
              )
              .join("\n")
          : "(none)",
      ];
      return lines.join("\n");
    }) ?? [];

  return [
    ...(args.auditReportTitle
      ? [
          "AUDIT REPORT CONTEXT",
          `Report: ${args.auditReportTitle}`,
          "Answer ONLY using evidence included in this audit report snapshot.",
          "Do not reference workspace data outside this report.",
          "Do not infer or reconstruct redacted secrets. Mention when evidence was excluded from the report.",
          "",
        ]
      : []),
    ...(args.viewName
      ? [
          "VIEW CONTEXT",
          `View: ${args.viewName}`,
          ...(args.viewDescription ? [`Description: ${args.viewDescription}`] : []),
          "",
        ]
      : []),
    ...(args.projectName ? [`PROJECT: ${args.projectName}`, ""] : []),
    "EVENTS",
    "",
    eventLines.length > 0 ? eventLines.join("\n\n") : "(none)",
    "",
    "WORKSTREAMS",
    "",
    workstreamLines.length > 0 ? workstreamLines.join("\n\n") : "(none)",
    "",
    "RELATED HISTORY",
    "",
    relatedLines.length > 0 ? relatedLines.join("\n\n") : "(none)",
    "",
    "ENTITY CONTEXT",
    "",
    entityBlocks.length > 0 ? entityBlocks.join("\n\n") : "(none)",
    "",
    "PERMISSION NOTE",
    args.auditReportTitle
      ? "This is an external auditor session scoped to a finalized audit report. Answer only from the report evidence above."
      : "The user may have scoped access. Answer only from the provided accessible context.",
    "If information may exist outside the user's access, do not mention or guess it.",
  ].join("\n");
}

async function retrieveAuditReportAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  auditReportId: Id<"auditReports">,
  clerkUserId: string,
  includeDebug: boolean,
): Promise<AskContextResult> {
  const report = await ctx.db.get(auditReportId);
  if (!report || report.workspaceId !== workspaceDocId) {
    throw new Error("Report not found");
  }

  const membership = await getWorkspaceMembership(ctx, workspaceDocId, clerkUserId);
  if (!membership) {
    throw new Error("Report not found");
  }
  await assertReportViewAccess(ctx, report, membership);

  const eventIds = report.snapshotEventIds ?? [];
  const workstreamIds = report.snapshotWorkstreamIds ?? [];

  const events: EventRecord[] = [];
  for (const eventId of eventIds) {
    const doc = await ctx.db.get(eventId);
    if (doc && doc.workspaceId === workspaceDocId) {
      events.push(docToEvent(doc));
    }
  }

  const workstreams: WorkstreamRecord[] = [];
  for (const workstreamId of workstreamIds) {
    const doc = await ctx.db.get(workstreamId);
    if (doc && doc.workspaceId === workspaceDocId) {
      workstreams.push(docToWorkstream(doc));
    }
  }

  let filteredEvents = filterAskContextEvents(
    events.sort((a, b) => b.occurredAt - a.occurredAt),
  );
  filteredEvents = filterSafeEventsForAsk(filteredEvents, membership.role);
  if (!includeDebug) {
    filteredEvents = filterPrimaryEventRecords(filteredEvents);
  }

  const primaryEventIds = filteredEvents
    .slice(0, 10)
    .map((event) => event.id as Id<"events">);
  const relatedLinks = await listLinksForEventIds(ctx, primaryEventIds, 3);

  return {
    contextText: formatAskContext({
      events: filteredEvents,
      workstreams: workstreams.sort((a, b) => b.startedAt - a.startedAt),
      relatedLinks,
      auditReportTitle: report.title,
    }),
    eventIds: filteredEvents.map((event) => event.id as Id<"events">),
    workstreamIds: workstreams.map((ws) => ws.id as Id<"workstreams">),
    events: filteredEvents,
    workstreams,
  };
}

async function retrieveImpactAnalysisAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  impactAnalysisId: Id<"impactAnalyses">,
  clerkUserId: string,
): Promise<AskContextResult> {
  const analysisDoc = await ctx.db.get(impactAnalysisId);
  if (!analysisDoc || analysisDoc.workspaceId !== workspaceDocId) {
    throw new Error("Impact analysis not found");
  }

  const membership = await getWorkspaceMembership(ctx, workspaceDocId, clerkUserId);
  if (!membership) {
    throw new Error("Impact analysis not found");
  }

  const accessible = await getAccessibleProjectIds(ctx, workspaceDocId, membership);
  const analysis = docToImpactAnalysis(analysisDoc);
  const findings = await listFindingsForAnalysis(ctx, impactAnalysisId);

  const events: EventRecord[] = [];
  const workstreams: WorkstreamRecord[] = [];
  const seenEvents = new Set<string>();
  const seenWorkstreams = new Set<string>();

  for (const finding of findings) {
    for (const eventId of finding.evidenceEventIds ?? []) {
      if (seenEvents.has(eventId)) continue;
      const doc = await ctx.db.get(eventId as Id<"events">);
      if (!doc || doc.workspaceId !== workspaceDocId) continue;
      const event = docToEvent(doc);
      if (!canViewEvent(event, accessible)) continue;
      if (!isEventSafeForAudit(event)) continue;
      seenEvents.add(eventId);
      events.push(event);
    }
    for (const workstreamId of finding.evidenceWorkstreamIds ?? []) {
      if (seenWorkstreams.has(workstreamId)) continue;
      const doc = await ctx.db.get(workstreamId as Id<"workstreams">);
      if (!doc || doc.workspaceId !== workspaceDocId) continue;
      seenWorkstreams.add(workstreamId);
      workstreams.push(docToWorkstream(doc));
    }
  }

  const contextText = [
    "IMPACT ANALYSIS CONTEXT",
    "You are answering from an impact analysis context. Do not claim causation.",
    "Use cautious language: possibly related, in the impact window, correlation only.",
    "",
    `Title: ${analysis.title}`,
    `Anchor: ${analysis.anchor.type} — ${analysis.anchor.title}`,
    `Status: ${analysis.status}`,
    "",
    analysis.generatedSummary ?? analysis.summary ?? "(no summary)",
    "",
    "FINDINGS",
    findings.length > 0
      ? findings
          .map((finding) => `- [${finding.confidence}] ${finding.title}: ${finding.summary}`)
          .join("\n")
      : "(none)",
    "",
    "METRICS NOTE",
    analysis.metrics
      ? "Baseline vs impact metrics are available in the analysis. Describe differences without claiming causation."
      : "Metrics not yet generated.",
  ].join("\n");

  return {
    contextText,
    eventIds: events.map((event) => event.id as Id<"events">),
    workstreamIds: workstreams.map((ws) => ws.id as Id<"workstreams">),
    events: events.sort((a, b) => b.occurredAt - a.occurredAt),
    workstreams: workstreams.sort((a, b) => b.startedAt - a.startedAt),
  };
}

async function retrieveLessonAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  lessonId: Id<"lessons">,
  clerkUserId: string,
): Promise<AskContextResult> {
  const lessonDoc = await ctx.db.get(lessonId);
  if (!lessonDoc || lessonDoc.workspaceId !== workspaceDocId) {
    throw new Error("Lesson not found");
  }

  const membership = await getWorkspaceMembership(ctx, workspaceDocId, clerkUserId);
  if (!membership) {
    throw new Error("Lesson not found");
  }

  const accessible = await getAccessibleProjectIds(ctx, workspaceDocId, membership);
  const lesson = docToLesson(lessonDoc);

  const events: EventRecord[] = [];
  const workstreams: WorkstreamRecord[] = [];
  for (const eventId of lesson.evidenceEventIds ?? []) {
    const doc = await ctx.db.get(eventId as Id<"events">);
    if (!doc || doc.workspaceId !== workspaceDocId) continue;
    const event = docToEvent(doc);
    if (!canViewEvent(event, accessible) || !isEventSafeForAudit(event)) continue;
    events.push(event);
  }
  for (const workstreamId of lesson.evidenceWorkstreamIds ?? []) {
    const doc = await ctx.db.get(workstreamId as Id<"workstreams">);
    if (!doc || doc.workspaceId !== workspaceDocId) continue;
    workstreams.push(docToWorkstream(doc));
  }

  const contextText = [
    "LESSON CONTEXT",
    "You are answering from a lesson record. Do not claim causation.",
    "Use cautious language: possibly related, may correlate, not proved.",
    "",
    `Title: ${lesson.title}`,
    `Type: ${lesson.type}`,
    `Confidence: ${lesson.confidence}`,
    `Source: ${lesson.source}`,
    "",
    `Summary: ${lesson.summary}`,
    lesson.recommendation ? `Recommendation: ${lesson.recommendation}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    contextText,
    eventIds: events.map((event) => event.id as Id<"events">),
    workstreamIds: workstreams.map((ws) => ws.id as Id<"workstreams">),
    events: events.sort((a, b) => b.occurredAt - a.occurredAt),
    workstreams: workstreams.sort((a, b) => b.startedAt - a.startedAt),
  };
}

async function retrievePlaybookAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  playbookId: Id<"playbooks">,
  clerkUserId: string,
): Promise<AskContextResult> {
  const playbookDoc = await ctx.db.get(playbookId);
  if (!playbookDoc || playbookDoc.workspaceId !== workspaceDocId) {
    throw new Error("Playbook not found");
  }

  const membership = await getWorkspaceMembership(ctx, workspaceDocId, clerkUserId);
  if (!membership) {
    throw new Error("Playbook not found");
  }

  const playbook = docToPlaybook(playbookDoc);
  const relatedLessons = [];
  for (const lessonId of playbook.lessonIds ?? []) {
    const lesson = await ctx.db.get(lessonId as Id<"lessons">);
    if (lesson) relatedLessons.push(docToLesson(lesson));
  }

  const contextText = [
    "PLAYBOOK CONTEXT",
    "You are answering from a playbook. Do not claim causation.",
    "",
    `Title: ${playbook.title}`,
    `Type: ${playbook.type}`,
    `Trigger: ${playbook.trigger ?? "(none)"}`,
    "",
    playbook.summary,
    "",
    "STEPS",
    ...playbook.steps.map(
      (step, index) =>
        `${step.order ?? index + 1}. ${step.title}${step.description ? `: ${step.description}` : ""}`,
    ),
    "",
    "VALIDATION",
    ...(playbook.validationRequirements ?? []).map(
      (req) =>
        `- ${req.title}${req.command ? ` (${req.command})` : ""}${req.reason ? `: ${req.reason}` : ""}`,
    ),
    "",
    "RELATED LESSONS",
    relatedLessons.length > 0
      ? relatedLessons.map((l) => `- ${l.title}: ${l.summary}`).join("\n")
      : "(none)",
  ].join("\n");

  return {
    contextText,
    eventIds: [],
    workstreamIds: [],
    events: [],
    workstreams: [],
  };
}

async function filterContextPackItemsForAsk(
  ctx: DbReadCtx,
  items: ContextPackItemRecord[],
  accessible: Awaited<ReturnType<typeof getMembershipAndAccessible>>["accessible"],
): Promise<ContextPackItemRecord[]> {
  const filtered: ContextPackItemRecord[] = [];
  for (const item of items) {
    if (item.eventId) {
      const event = await ctx.db.get(item.eventId as Id<"events">);
      if (!event || !canViewEvent(event, accessible) || !isEventSafeForAudit(event)) continue;
    }
    if (item.workstreamId) {
      const ws = await ctx.db.get(item.workstreamId as Id<"workstreams">);
      if (!ws || !canViewWorkstream(ws, accessible)) continue;
    }
    filtered.push(item);
  }
  return filtered;
}

async function retrieveContextPackAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  contextPackId: Id<"contextPacks">,
  clerkUserId: string,
): Promise<AskContextResult> {
  const packDoc = await ctx.db.get(contextPackId);
  if (!packDoc || packDoc.workspaceId !== workspaceDocId) {
    throw new Error("Context pack not found");
  }

  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    workspaceDocId,
    clerkUserId,
  );
  if (membership.role === "auditor") {
    throw new Error("Access denied");
  }

  const pack = docToContextPack(packDoc);
  const items = await filterContextPackItemsForAsk(
    ctx,
    await listItemsForContextPack(ctx, contextPackId),
    accessible,
  );

  const contextText = [
    "CONTEXT PACK",
    "Answer from the context pack items below first. Do not claim causation.",
    "Use cautious language. Do not infer or reconstruct redacted secrets.",
    "",
    formatContextPackText(pack, items),
  ].join("\n");

  const eventIds = items
    .filter((item) => item.eventId)
    .map((item) => item.eventId as Id<"events">);
  const workstreamIds = items
    .filter((item) => item.workstreamId)
    .map((item) => item.workstreamId as Id<"workstreams">);

  return {
    contextText,
    eventIds,
    workstreamIds,
    events: [],
    workstreams: [],
  };
}

async function retrieveRecommendationAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  recommendationId: Id<"recommendations">,
  clerkUserId: string,
): Promise<AskContextResult> {
  const doc = await ctx.db.get(recommendationId);
  if (!doc || doc.workspaceId !== workspaceDocId) {
    throw new Error("Recommendation not found");
  }

  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    workspaceDocId,
    clerkUserId,
  );
  if (membership.role === "auditor") {
    throw new Error("Access denied");
  }

  const recommendation = await filterRecommendationEvidence(
    ctx,
    docToRecommendation(doc),
    accessible,
  );

  const lines = [
    "RECOMMENDATION",
    `Title: ${recommendation.title}`,
    `Summary: ${recommendation.summary}`,
    recommendation.reason ? `Reason: ${recommendation.reason}` : "",
    recommendation.suggestedGoal ? `Suggested goal: ${recommendation.suggestedGoal}` : "",
    recommendation.suggestedWorkstreamTitle
      ? `Suggested workstream: ${recommendation.suggestedWorkstreamTitle}`
      : "",
    "",
    "Answer from this recommendation evidence first. Do not claim causation.",
    "Use cautious language. Note when evidence is weak or incomplete.",
    "Do not infer or reconstruct redacted secrets.",
  ].filter(Boolean);

  if (recommendation.validationRequirements?.length) {
    lines.push("", "Validation requirements:");
    for (const req of recommendation.validationRequirements) {
      lines.push(`- ${req.title}${req.command ? ` (${req.command})` : ""}`);
    }
  }

  if (recommendation.source === "eval_failure") {
    lines.push("", "EVAL REMEDIATION CONTEXT");
    if (recommendation.evalRunId) lines.push(`Source eval run: ${recommendation.evalRunId}`);
    if (recommendation.evalSuiteId) lines.push(`Eval suite: ${recommendation.evalSuiteId}`);
    if (recommendation.remediationStatus) {
      lines.push(`Remediation status: ${recommendation.remediationStatus}`);
    }
    lines.push(
      "Do not claim the fix worked unless remediationStatus is eval_rerun_passed.",
      "Use eval evidence first.",
    );
  }

  const eventIds = (recommendation.evidenceEventIds ?? []).map((id) => id as Id<"events">);
  const workstreamIds = (recommendation.evidenceWorkstreamIds ?? []).map(
    (id) => id as Id<"workstreams">,
  );

  if (eventIds.length) {
    lines.push("", "Linked events:");
    for (const eventId of eventIds.slice(0, 15)) {
      const event = await ctx.db.get(eventId);
      if (event && canViewEvent(event, accessible) && isEventSafeForAudit(event)) {
        lines.push(`- ${formatTimestamp(event.occurredAt)} ${event.title}`);
      }
    }
  }

  return {
    contextText: lines.join("\n"),
    eventIds,
    workstreamIds,
    events: [],
    workstreams: [],
  };
}

async function retrieveEvalSuiteAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  evalSuiteId: Id<"evalSuites">,
  clerkUserId: string,
): Promise<AskContextResult> {
  const doc = await ctx.db.get(evalSuiteId);
  if (!doc || doc.workspaceId !== workspaceDocId) {
    throw new Error("Eval suite not found");
  }

  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    workspaceDocId,
    clerkUserId,
  );
  if (membership.role === "auditor") {
    throw new Error("Access denied");
  }

  const suite = docToEvalSuite(doc);
  const cases = await listEvalCasesForSuite(ctx, evalSuiteId);
  const lines = [
    "PRIVATE EVAL SUITE",
    `Title: ${suite.title}`,
    `Summary: ${suite.summary}`,
    `Source: ${suite.source}`,
    `Status: ${suite.status}`,
    "",
    "Cases:",
    ...cases.map(
      (evalCase) =>
        `- [${evalCase.required ? "required" : "optional"}] ${evalCase.title} (${evalCase.type})`,
    ),
    "",
    "Answer about what this eval suite checks. Do not claim causation.",
    "Use cautious language. Do not infer redacted secrets.",
  ];

  return {
    contextText: lines.join("\n"),
    eventIds: [],
    workstreamIds: suite.workstreamId ? [suite.workstreamId as Id<"workstreams">] : [],
    events: [],
    workstreams: [],
  };
}

async function retrieveEvalRunAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  evalRunId: Id<"evalRuns">,
  clerkUserId: string,
): Promise<AskContextResult> {
  const doc = await ctx.db.get(evalRunId);
  if (!doc || doc.workspaceId !== workspaceDocId) {
    throw new Error("Eval run not found");
  }

  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    workspaceDocId,
    clerkUserId,
  );
  if (membership.role === "auditor") {
    throw new Error("Access denied");
  }

  const run = docToEvalRun(doc);
  const results = await filterEvalResultsEvidence(
    ctx,
    await listEvalResultsForRun(ctx, evalRunId),
    accessible,
  );

  const lines = [
    "EVAL RUN",
    `Status: ${run.status}`,
    run.summary ? `Summary: ${run.summary}` : "",
    "",
    "Case results:",
    ...results.map(
      (result) =>
        `- ${result.title}: ${result.status}${result.summary ? ` — ${result.summary}` : ""}`,
    ),
    "",
    "Explain why this eval failed or what to fix next. Do not claim causation.",
    "Use eval evidence first. Do not claim the fix worked unless a remediation re-run passed.",
    "Use cautious language. Do not infer redacted secrets.",
    "Do not expose inaccessible or unsafe evidence.",
  ].filter(Boolean);

  const eventIds = results.flatMap((result) =>
    (result.evidenceEventIds ?? []).map((id) => id as Id<"events">),
  );

  return {
    contextText: lines.join("\n"),
    eventIds,
    workstreamIds: run.workstreamId ? [run.workstreamId as Id<"workstreams">] : [],
    events: [],
    workstreams: [],
  };
}

async function retrieveDeliveryAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  deliveryId: Id<"ingestDeliveries">,
  clerkUserId: string,
): Promise<AskContextResult> {
  const doc = await findDeliveryById(ctx, deliveryId);
  if (!doc || doc.workspaceId !== workspaceDocId) {
    throw new Error("Delivery not found");
  }

  const { membership } = await getMembershipAndAccessible(ctx, workspaceDocId, clerkUserId);
  if (membership.role === "auditor") {
    throw new Error("Access denied");
  }

  const delivery = docToIngestDeliverySummary(doc);
  const lines = [
    "INGEST DELIVERY",
    `Source: ${delivery.source}`,
    `Source event ID: ${delivery.sourceEventId}`,
    `Status: ${delivery.status}`,
    `Attempts: ${delivery.attempts}`,
    delivery.lastError ? `Last error: ${delivery.lastError}` : "",
    delivery.journalRef ? `Journal ref: ${delivery.journalRef}` : "",
    delivery.redacted ? "Payload was redacted before journaling." : "",
    "",
    "Explain what happened with this ingest delivery and what to do next.",
    "Do not infer or reconstruct redacted secrets.",
    "Use cautious language about retries and replay.",
  ].filter(Boolean);

  const eventIds = delivery.eventId ? [delivery.eventId as Id<"events">] : [];

  return {
    contextText: lines.join("\n"),
    eventIds,
    workstreamIds: [],
    events: [],
    workstreams: [],
  };
}

async function retrieveDeadLetterAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  deadLetterId: Id<"ingestDeadLetters">,
  clerkUserId: string,
): Promise<AskContextResult> {
  const doc = await findDeadLetterById(ctx, deadLetterId);
  if (!doc || doc.workspaceId !== workspaceDocId) {
    throw new Error("Dead letter not found");
  }

  const { membership } = await getMembershipAndAccessible(ctx, workspaceDocId, clerkUserId);
  if (membership.role === "auditor") {
    throw new Error("Access denied");
  }

  const deadLetter = docToDeadLetterSummary(doc);
  const lines = [
    "INGEST DEAD LETTER",
    `Source: ${deadLetter.source}`,
    `Source event ID: ${deadLetter.sourceEventId}`,
    `Reason: ${deadLetter.reason}`,
    `Status: ${deadLetter.status}`,
    `Attempts: ${deadLetter.attempts}`,
    deadLetter.error ? `Error: ${deadLetter.error}` : "",
    deadLetter.journalRef ? `Journal ref: ${deadLetter.journalRef}` : "",
    deadLetter.payloadPreview ? `Payload preview: ${deadLetter.payloadPreview}` : "",
    deadLetter.redacted ? "Payload was redacted before journaling." : "",
    "",
    "Explain why this delivery dead-lettered and how to replay or fix it.",
    "Do not infer or reconstruct redacted secrets.",
    "Use cautious language. Note when journal replay may be required.",
  ].filter(Boolean);

  const eventIds: Id<"events">[] = [];

  return {
    contextText: lines.join("\n"),
    eventIds,
    workstreamIds: [],
    events: [],
    workstreams: [],
  };
}

async function retrieveDecisionAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  workspaceExternalId: string,
  decisionId: Id<"decisions">,
  clerkUserId: string,
): Promise<AskContextResult> {
  const decisionDoc = await ctx.db.get(decisionId);
  if (!decisionDoc || decisionDoc.workspaceId !== workspaceDocId) {
    throw new Error("Decision not found");
  }

  await assertDecisionRead(ctx, workspaceExternalId, clerkUserId, decisionDoc);
  const decision = docToDecision(decisionDoc);
  const rollbacks = await listRollbacksForDecision(ctx, decisionId);

  const events: EventRecord[] = [];
  for (const eventId of decision.linkedEventIds ?? []) {
    const doc = await ctx.db.get(eventId as Id<"events">);
    if (!doc || doc.workspaceId !== workspaceDocId) continue;
    events.push(docToEvent(doc));
  }

  const workstreams: WorkstreamRecord[] = [];
  if (decision.workstreamId) {
    const wsDoc = await ctx.db.get(decision.workstreamId as Id<"workstreams">);
    if (wsDoc) workstreams.push(docToWorkstream(wsDoc));
  }
  for (const wsId of decision.linkedWorkstreamIds ?? []) {
    const doc = await ctx.db.get(wsId as Id<"workstreams">);
    if (doc) workstreams.push(docToWorkstream(doc));
  }

  const contextText = [
    "DECISION CONTEXT",
    "You are answering about a recorded company decision.",
    "Do not claim causation without impact evidence.",
    "Do not include raw Slack payloads or secrets.",
    "Use cautious language: possibly related, may correlate, not proved.",
    "",
    `Title: ${decision.title}`,
    `Type: ${decision.decisionType}`,
    `Status: ${decision.status}`,
    `Source: ${decision.source}`,
    decision.summary ? `Summary: ${decision.summary}` : "",
    decision.rationale ? `Rationale: ${decision.rationale}` : "",
    decision.expectedOutcome ? `Expected outcome: ${decision.expectedOutcome}` : "",
    decision.rollbackPlan ? `Rollback plan: ${decision.rollbackPlan}` : "",
    rollbacks.length
      ? `Rollbacks: ${rollbacks.map((r) => r.title).join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    contextText,
    eventIds: events.map((event) => event.id as Id<"events">),
    workstreamIds: workstreams.map((ws) => ws.id as Id<"workstreams">),
    events: events.sort((a, b) => b.occurredAt - a.occurredAt),
    workstreams: workstreams.sort((a, b) => b.startedAt - a.startedAt),
  };
}

async function retrieveIncidentAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  workspaceExternalId: string,
  incidentId: Id<"incidents">,
  clerkUserId: string,
): Promise<AskContextResult> {
  const incidentDoc = await ctx.db.get(incidentId);
  if (!incidentDoc || incidentDoc.workspaceId !== workspaceDocId) {
    throw new Error("Incident not found");
  }

  await assertIncidentRead(ctx, workspaceExternalId, clerkUserId, incidentDoc);
  const incident = docToIncident(incidentDoc);
  const preview = safeIncidentPreviewForAudit(incidentDoc);

  const signals: Array<{ title: string; summary?: string; signalType: string; severity: string }> =
    [];
  const signalIds = new Set<string>(incident.linkedSignalIds ?? []);
  for (const signalId of signalIds) {
    const signalDoc = await ctx.db.get(signalId as Id<"observabilitySignals">);
    if (!signalDoc || signalDoc.workspaceId !== workspaceDocId) continue;
    const signalPreview = safeObservabilitySignalPreviewForAudit(signalDoc);
    const record = docToObservabilitySignal(signalDoc);
    signals.push({
      title: signalPreview.title,
      summary: signalPreview.summary,
      signalType: record.signalType,
      severity: record.severity,
    });
  }

  const linkedSignals = await ctx.db
    .query("observabilitySignals")
    .withIndex("by_incident", (q) => q.eq("incidentId", incidentId))
    .take(10);
  for (const signalDoc of linkedSignals) {
    if (signalIds.has(signalDoc._id)) continue;
    const signalPreview = safeObservabilitySignalPreviewForAudit(signalDoc);
    const record = docToObservabilitySignal(signalDoc);
    signals.push({
      title: signalPreview.title,
      summary: signalPreview.summary,
      signalType: record.signalType,
      severity: record.severity,
    });
  }

  const workstreams: WorkstreamRecord[] = [];
  if (incident.workstreamId) {
    const wsDoc = await ctx.db.get(incident.workstreamId as Id<"workstreams">);
    if (wsDoc) workstreams.push(docToWorkstream(wsDoc));
  }
  for (const wsId of incident.linkedWorkstreamIds ?? []) {
    const doc = await ctx.db.get(wsId as Id<"workstreams">);
    if (doc) workstreams.push(docToWorkstream(doc));
  }

  const linkedDecisions: string[] = [];
  for (const decisionId of incident.linkedDecisionIds ?? []) {
    const decisionDoc = await ctx.db.get(decisionId as Id<"decisions">);
    if (!decisionDoc) continue;
    const decision = docToDecision(decisionDoc);
    linkedDecisions.push(
      `- ${decision.title}${decision.summary ? `: ${decision.summary}` : ""}`,
    );
  }

  const linkedRollbacks: string[] = [];
  for (const rollbackId of incident.linkedRollbackIds ?? []) {
    const rollbackDoc = await ctx.db.get(rollbackId as Id<"rollbackEvents">);
    if (!rollbackDoc) continue;
    const rollback = docToRollback(rollbackDoc);
    linkedRollbacks.push(
      `- ${rollback.title}${rollback.summary ?? rollback.reason ? `: ${rollback.summary ?? rollback.reason}` : ""}`,
    );
  }

  const events: EventRecord[] = [];
  const linkedPullRequests: string[] = [];
  for (const eventId of incident.linkedEventIds ?? []) {
    const doc = await ctx.db.get(eventId as Id<"events">);
    if (!doc || doc.workspaceId !== workspaceDocId) continue;
    const event = docToEvent(doc);
    events.push(event);
    if (event.entity?.type === "pull_request") {
      const prLabel =
        event.entity.name ?? event.entity.id ?? event.title;
      linkedPullRequests.push(`- ${prLabel}: ${event.title}`);
    }
  }

  const contextText = [
    "INCIDENT CONTEXT",
    "You are answering about a recorded incident.",
    "Do not claim causation without impact evidence.",
    "Do not include raw observability payloads or secrets.",
    "Use cautious language: possibly related, may correlate, not proved.",
    "",
    `Title: ${preview.title}`,
    `Status: ${incident.status}`,
    `Severity: ${incident.severity}`,
    `Source: ${incident.source}`,
    preview.summary ? `Summary: ${preview.summary}` : "",
    incident.service ? `Service: ${incident.service}` : "",
    incident.environment ? `Environment: ${incident.environment}` : "",
    incident.rootCause ? `Root cause: ${incident.rootCause}` : "",
    incident.mitigation ? `Mitigation: ${incident.mitigation}` : "",
    incident.rollbackSummary ? `Rollback summary: ${incident.rollbackSummary}` : "",
    "",
    "OBSERVABILITY SIGNALS",
    signals.length > 0
      ? signals
          .map(
            (s) =>
              `- [${s.severity}/${s.signalType}] ${s.title}${s.summary ? `: ${s.summary}` : ""}`,
          )
          .join("\n")
      : "(none)",
    "",
    "LINKED WORKSTREAMS",
    workstreams.length > 0
      ? workstreams.map((ws) => `- ${ws.title}`).join("\n")
      : "(none)",
    "",
    "LINKED PULL REQUESTS",
    linkedPullRequests.length > 0 ? linkedPullRequests.join("\n") : "(none)",
    "",
    "LINKED DECISIONS",
    linkedDecisions.length > 0 ? linkedDecisions.join("\n") : "(none)",
    "",
    "LINKED ROLLBACKS",
    linkedRollbacks.length > 0 ? linkedRollbacks.join("\n") : "(none)",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    contextText,
    eventIds: events.map((event) => event.id as Id<"events">),
    workstreamIds: workstreams.map((ws) => ws.id as Id<"workstreams">),
    events: events.sort((a, b) => b.occurredAt - a.occurredAt),
    workstreams: workstreams.sort((a, b) => b.startedAt - a.startedAt),
  };
}

export async function retrieveAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  question: string,
  options: RetrieveAskContextOptions = {},
): Promise<AskContextResult> {
  const includeDebug = questionRequestsDebugEvents(question);

  if (options.clerkUserId) {
    const membership = await getWorkspaceMembership(
      ctx,
      workspaceDocId,
      options.clerkUserId,
    );
    if (membership?.role === "auditor" && !options.auditReportId) {
      throw new Error("Access denied");
    }
  }

  if (options.auditReportId && options.clerkUserId) {
    return retrieveAuditReportAskContext(
      ctx,
      workspaceDocId,
      options.auditReportId,
      options.clerkUserId,
      includeDebug,
    );
  }

  if (options.impactAnalysisId && options.clerkUserId) {
    return retrieveImpactAnalysisAskContext(
      ctx,
      workspaceDocId,
      options.impactAnalysisId,
      options.clerkUserId,
    );
  }

  if (options.decisionId && options.clerkUserId) {
    const workspace = await ctx.db.get(workspaceDocId);
    if (!workspace) throw new Error("Workspace not found");
    return retrieveDecisionAskContext(
      ctx,
      workspaceDocId,
      workspace.externalId,
      options.decisionId,
      options.clerkUserId,
    );
  }

  if (options.incidentId && options.clerkUserId) {
    const workspace = await ctx.db.get(workspaceDocId);
    if (!workspace) throw new Error("Workspace not found");
    return retrieveIncidentAskContext(
      ctx,
      workspaceDocId,
      workspace.externalId,
      options.incidentId,
      options.clerkUserId,
    );
  }

  if (options.lessonId && options.clerkUserId) {
    return retrieveLessonAskContext(
      ctx,
      workspaceDocId,
      options.lessonId,
      options.clerkUserId,
    );
  }

  if (options.playbookId && options.clerkUserId) {
    return retrievePlaybookAskContext(
      ctx,
      workspaceDocId,
      options.playbookId,
      options.clerkUserId,
    );
  }

  if (options.contextPackId && options.clerkUserId) {
    return retrieveContextPackAskContext(
      ctx,
      workspaceDocId,
      options.contextPackId,
      options.clerkUserId,
    );
  }

  if (options.recommendationId && options.clerkUserId) {
    return retrieveRecommendationAskContext(
      ctx,
      workspaceDocId,
      options.recommendationId,
      options.clerkUserId,
    );
  }

  if (options.evalSuiteId && options.clerkUserId) {
    return retrieveEvalSuiteAskContext(
      ctx,
      workspaceDocId,
      options.evalSuiteId,
      options.clerkUserId,
    );
  }

  if (options.evalRunId && options.clerkUserId) {
    return retrieveEvalRunAskContext(
      ctx,
      workspaceDocId,
      options.evalRunId,
      options.clerkUserId,
    );
  }

  if (options.deliveryId && options.clerkUserId) {
    return retrieveDeliveryAskContext(
      ctx,
      workspaceDocId,
      options.deliveryId,
      options.clerkUserId,
    );
  }

  if (options.deadLetterId && options.clerkUserId) {
    return retrieveDeadLetterAskContext(
      ctx,
      workspaceDocId,
      options.deadLetterId,
      options.clerkUserId,
    );
  }

  let projectName: string | undefined;
  let viewName: string | undefined;
  let viewDescription: string | undefined;

  let accessible: Awaited<ReturnType<typeof getAccessibleProjectIds>> = "all";
  if (options.clerkUserId) {
    const membership = await getWorkspaceMembership(
      ctx,
      workspaceDocId,
      options.clerkUserId,
    );
    if (membership) {
      accessible = await getAccessibleProjectIds(ctx, workspaceDocId, membership);
    }
  }

  if (options.viewId && options.clerkUserId) {
    const membership = await getWorkspaceMembership(
      ctx,
      workspaceDocId,
      options.clerkUserId,
    );
    if (membership) {
      const view = await assertSavedViewAccess(ctx, options.viewId, membership);
      viewName = view.name;
      viewDescription = view.description;

      const viewEvents = await applySavedViewFilters(ctx, workspaceDocId, view.filters, {
        limit: 40,
        accessibleProjects: accessible,
      });

      const workstreamMap = new Map<string, WorkstreamRecord>();
      for (const event of viewEvents) {
        if (event.workstreamId) {
          const workstreamDoc = await ctx.db.get(event.workstreamId as Id<"workstreams">);
          if (workstreamDoc && workstreamDoc.workspaceId === workspaceDocId) {
            workstreamMap.set(workstreamDoc._id, docToWorkstream(workstreamDoc));
          }
        }
      }

      const entityContexts: Array<{ entity: EntityRecord; events: EventRecord[] }> = [];
      const entityKeys = new Set<string>();
      for (const event of viewEvents) {
        if (!event.entity?.type) continue;
        const key = `${event.entity.type}:${event.entity.id ?? event.entity.name ?? ""}`;
        if (entityKeys.has(key)) continue;
        entityKeys.add(key);

        const entityDoc = await ctx.db
          .query("entities")
          .withIndex("by_workspace_type_key", (q) =>
            q
              .eq("workspaceId", workspaceDocId)
              .eq("type", event.entity!.type as EntityRecord["type"])
              .eq("key", event.entity!.id ?? event.entity!.name ?? ""),
          )
          .unique();

        if (entityDoc) {
          const record = docToEntity(entityDoc);
          entityContexts.push({
            entity: record,
            events: viewEvents.filter(
              (item) =>
                item.entity?.type === record.type &&
                (item.entity.id === record.key || item.entity.name === record.name),
            ),
          });
        }
      }

      let events = filterAskContextEvents(viewEvents);
      if (!includeDebug) {
        events = filterPrimaryEventRecords(events);
      }
      const workstreams = Array.from(workstreamMap.values()).sort(
        (a, b) => b.startedAt - a.startedAt,
      );

      const primaryEventIds = events.slice(0, 10).map((event) => event.id as Id<"events">);
      const relatedLinks = await listLinksForEventIds(ctx, primaryEventIds, 3);

      return {
        contextText: formatAskContext({
          events,
          workstreams,
          relatedLinks,
          entityContexts,
          viewName,
          viewDescription,
        }),
        eventIds: events.map((event) => event.id as Id<"events">),
        workstreamIds: workstreams.map((ws) => ws.id as Id<"workstreams">),
        events,
        workstreams,
      };
    }
  }

  if (options.projectId) {
    const projectDoc = await ctx.db.get(options.projectId);
    if (projectDoc && projectDoc.workspaceId === workspaceDocId) {
      const workspace = await ctx.db.get(workspaceDocId);
      if (workspace) {
        projectName = docToProjectRecord(projectDoc, workspace.externalId).name;
      }

      const projectEvents = await listEventsForWorkspace(ctx, workspaceDocId, {
        projectId: options.projectId,
        limit: 30,
        visibility: includeDebug ? "all" : "primary",
        includeDebug,
        accessibleProjects: accessible,
      });
      const projectWorkstreams = await listWorkstreamsForWorkspace(ctx, workspaceDocId, {
        projectId: options.projectId,
        limit: 10,
        accessibleProjects: accessible,
      });
      const projectEntities = await listEntitiesByProject(
        ctx,
        workspaceDocId,
        options.projectId,
        { limit: 5 },
      );

      const eventMap = new Map<string, EventRecord>();
      for (const event of projectEvents) {
        eventMap.set(event.id, event);
      }

      const workstreamMap = new Map<string, WorkstreamRecord>();
      for (const workstream of projectWorkstreams) {
        workstreamMap.set(workstream.id, workstream);
      }

      const entityContexts: Array<{ entity: EntityRecord; events: EventRecord[] }> = [];
      for (const entity of projectEntities) {
        const timelineEvents = (
          await getEntityTimelineEvents(ctx, workspaceDocId, entity, {
            visibility: includeDebug ? "all" : "primary",
            limit: 20,
          })
        ).filter((event) => event.projectId === options.projectId);

        entityContexts.push({ entity, events: timelineEvents });
        for (const event of timelineEvents) {
          eventMap.set(event.id, event);
        }
      }

      let events = filterAskContextEvents(
        Array.from(eventMap.values()).sort((a, b) => b.occurredAt - a.occurredAt),
      );
      if (!includeDebug) {
        events = filterPrimaryEventRecords(events);
      }
      const workstreams = Array.from(workstreamMap.values()).sort(
        (a, b) => b.startedAt - a.startedAt,
      );

      const primaryEventIds = events.slice(0, 10).map((event) => event.id as Id<"events">);
      const relatedLinks = await listLinksForEventIds(ctx, primaryEventIds, 3);

      return {
        contextText: formatAskContext({
          events,
          workstreams,
          relatedLinks,
          entityContexts,
          projectName,
          viewName,
          viewDescription,
        }),
        eventIds: events.map((event) => event.id as Id<"events">),
        workstreamIds: workstreams.map((ws) => ws.id as Id<"workstreams">),
        events,
        workstreams,
      };
    }
  }

  const searchedEvents = (
    await searchEventsForWorkspace(ctx, workspaceDocId, {
      query: question,
      limit: 30,
      includeDebug: true,
      includeHidden: false,
      accessibleProjects: accessible,
    })
  );

  const searchedWorkstreams = await searchWorkstreamsForWorkspace(ctx, workspaceDocId, {
    query: question,
    limit: 10,
    accessibleProjects: accessible,
  });

  const eventMap = new Map<string, EventRecord>();
  for (const event of searchedEvents) {
    eventMap.set(event.id, event);
  }

  const workstreamMap = new Map<string, WorkstreamRecord>();
  for (const workstream of searchedWorkstreams) {
    workstreamMap.set(workstream.id, workstream);
  }

  const entityMap = new Map<string, EntityRecord>();
  const entityContexts: Array<{ entity: EntityRecord; events: EventRecord[] }> = [];

  if (options.entityId) {
    const focusedEntity = await ctx.db.get(options.entityId);
    if (focusedEntity && focusedEntity.workspaceId === workspaceDocId) {
      const record = docToEntity(focusedEntity);
      entityMap.set(record.id, record);
      const timelineEvents = await getEntityTimelineEvents(
        ctx,
        workspaceDocId,
        record,
        { visibility: includeDebug ? "all" : "primary", limit: 30 },
      );
      entityContexts.push({ entity: record, events: timelineEvents });
      for (const event of timelineEvents) {
        eventMap.set(event.id, event);
      }
    }
  } else {
    const matchedEntities = await searchEntitiesForWorkspace(ctx, workspaceDocId, {
      query: question,
      limit: 3,
      includeDebug: includeDebug,
    });
    for (const entity of matchedEntities) {
      entityMap.set(entity.id, entity);
      const timelineEvents = await getEntityTimelineEvents(
        ctx,
        workspaceDocId,
        entity,
        { visibility: includeDebug ? "all" : "primary", limit: 15 },
      );
      entityContexts.push({ entity, events: timelineEvents });
      for (const event of timelineEvents) {
        eventMap.set(event.id, event);
      }
    }
  }

  if (options.workstreamId) {
    const focusedWorkstream = await ctx.db.get(options.workstreamId);
    if (focusedWorkstream && focusedWorkstream.workspaceId === workspaceDocId) {
      workstreamMap.set(focusedWorkstream._id, docToWorkstream(focusedWorkstream));

      const focusedEvents = await listEventsByWorkstream(ctx, options.workstreamId, {
        limit: 100,
      });
      for (const event of focusedEvents) {
        eventMap.set(event.id, event);
      }
    }
  }

  if (eventMap.size < 5) {
    const recentEvents = await listEventsForWorkspace(ctx, workspaceDocId, {
      limit: 20,
      visibility: includeDebug ? "all" : "primary",
      includeDebug,
    });
    for (const event of recentEvents) {
      eventMap.set(event.id, event);
    }
  }

  let events = filterAskContextEvents(
    Array.from(eventMap.values()).sort((a, b) => b.occurredAt - a.occurredAt),
  );
  if (!includeDebug) {
    events = filterPrimaryEventRecords(events);
  }
  const workstreams = Array.from(workstreamMap.values()).sort(
    (a, b) => b.startedAt - a.startedAt,
  );

  const primaryEventIds = events.slice(0, 10).map((event) => event.id as Id<"events">);
  const relatedLinks = await listLinksForEventIds(ctx, primaryEventIds, 3);

  for (const item of relatedLinks) {
    if (item.fromEvent && !eventMap.has(item.fromEvent.id)) {
      eventMap.set(item.fromEvent.id, item.fromEvent);
    }
    if (item.toEvent && !eventMap.has(item.toEvent.id)) {
      eventMap.set(item.toEvent.id, item.toEvent);
    }
  }

  const allEvents = includeDebug
    ? filterAskContextEvents(
        Array.from(eventMap.values()).sort((a, b) => b.occurredAt - a.occurredAt),
      )
    : filterPrimaryEventRecords(
        filterAskContextEvents(
          Array.from(eventMap.values()).sort((a, b) => b.occurredAt - a.occurredAt),
        ),
      );

  let memberRole: string | undefined;
  if (options.clerkUserId) {
    const membership = await getWorkspaceMembership(
      ctx,
      workspaceDocId,
      options.clerkUserId,
    );
    memberRole = membership?.role;
  }
  const safeEvents = filterSafeEventsForAsk(allEvents, memberRole);

  return {
    contextText: formatAskContext({
      events: safeEvents,
      workstreams,
      relatedLinks,
      entityContexts,
      viewName,
      viewDescription,
    }),
    eventIds: safeEvents.map((event) => event.id as Id<"events">),
    workstreamIds: workstreams.map((ws) => ws.id as Id<"workstreams">),
    events: safeEvents,
    workstreams,
  };
}
