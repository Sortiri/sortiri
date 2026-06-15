import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { deriveExternalStatus } from "../integrations/health";
import type { SourceHealthEntry } from "../integrations/health";
import {
  getIntegrationConnection,
  getActiveIntegrationSecretMetadata,
} from "./integrationSharedLib";
import { getActiveSecretForWorkspace as getLegacyGithubSecret } from "./githubWebhookSecretsLib";
import { listFindingsForRun, listInsightRunsForWorkspace } from "./insightRunsLib";
import {
  listFindingsForAnalysis,
  listImpactAnalysesForWorkspace,
} from "./impactAnalysesLib";
import { listLessonsForWorkspace } from "./lessonsLib";
import { listPlaybooksForWorkspace, suggestPlaybooksForGoal } from "./playbooksLib";
import { collectKnownFailures } from "./knownFailures";
import { listEventsInRange } from "./impactData";
import { generateValidationRequirements } from "./validationRequirements";
import type { AccessibleProjects } from "./projectAccessLib";
import type { RecommendationInput } from "./recommendationLib";
import {
  createRecommendationDoc,
  findOpenRecommendationByDedupKey,
} from "./recommendationLib";
import {
  buildFailureRecommendationReason,
  buildLessonRecommendationReason,
  buildRecommendationReasonFromImpact,
  buildRecommendationReasonFromInsight,
  buildSourceHealthReason,
} from "./recommendationCopy";
import {
  confidenceFromSeverity,
  priorityFromEventType,
  priorityFromImpactFinding,
  priorityFromInsightFinding,
  priorityFromKnownFailure,
  priorityFromSourceHealth,
} from "./recommendationPriority";
import { DEFAULT_CONTEXT_TIME_WINDOW_MS } from "./contextRelevance";

type DbReadCtx = Pick<QueryCtx, "db">;

export type DraftRecommendation = Omit<
  RecommendationInput,
  "status" | "createdBy"
> & { dedupKey: string };

const EXTERNAL_SOURCES = ["github", "stripe", "posthog"] as const;
const DEFAULT_WINDOW_MS = DEFAULT_CONTEXT_TIME_WINDOW_MS;

function insightTypeToRecommendationType(
  type: Doc<"insightFindings">["type"],
): Doc<"recommendations">["type"] {
  switch (type) {
    case "sensitive_evidence":
      return "security_review";
    case "error":
      return "fix";
    case "impact_opportunity":
      return "investigate";
    case "lesson_opportunity":
      return "validate";
    case "risk":
      return "investigate";
    case "product_movement":
      return "improve";
    case "duplicate_work":
    case "stale_workstream":
      return "review";
    case "decision":
      return "review";
    default:
      return "investigate";
  }
}

function impactTypeToRecommendationType(
  type: Doc<"impactFindings">["type"],
): Doc<"recommendations">["type"] {
  switch (type) {
    case "negative_signal":
    case "risk":
    case "payment_activity":
      return "fix";
    case "product_movement":
    case "feature_usage":
    case "activation_movement":
      return "improve";
    case "revenue_movement":
      return "investigate";
    default:
      return "review";
  }
}

async function collectSourceHealthEntries(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
): Promise<SourceHealthEntry[]> {
  const entries: SourceHealthEntry[] = [];

  for (const source of EXTERNAL_SOURCES) {
    const docs = await ctx.db
      .query("events")
      .withIndex("by_source", (q) => q.eq("workspaceId", workspaceId).eq("source", source))
      .collect();

    const primaryEventCount = docs.filter((doc) => doc.visibility === "primary").length;
    const eventCountFromEvents = docs.length;
    const lastEventFromEvents =
      eventCountFromEvents > 0
        ? docs.reduce(
            (max, doc) => (doc.occurredAt > max ? doc.occurredAt : max),
            docs[0]!.occurredAt,
          )
        : undefined;

    const connection = await getIntegrationConnection(ctx, workspaceId, source);
    const secretMeta = await getActiveIntegrationSecretMetadata(ctx, workspaceId, source);
    const legacyGithub =
      source === "github" && !secretMeta
        ? await getLegacyGithubSecret(ctx, workspaceId)
        : null;

    const metadata = connection?.metadata as { lastError?: string } | undefined;
    const hasActiveSecret = Boolean(secretMeta) || Boolean(legacyGithub);
    const eventCount = Math.max(connection?.eventCount ?? 0, eventCountFromEvents);
    const lastEventAt = connection?.lastEventAt ?? lastEventFromEvents;

    entries.push({
      source,
      status: deriveExternalStatus({
        connectionStatus: connection?.status,
        hasActiveSecret,
        lastError: metadata?.lastError,
        hasEvents: eventCount > 0,
      }),
      eventCount,
      primaryEventCount,
      lastEventAt,
      lastError: metadata?.lastError,
      hasActiveSecret,
      secretLast4: secretMeta?.secretLast4 ?? legacyGithub?.last4,
      connectionId: connection?._id ?? secretMeta?.connectionId,
    });
  }

  return entries;
}

function attachPlaybookAndValidation(
  draft: DraftRecommendation,
  playbooks: Awaited<ReturnType<typeof listPlaybooksForWorkspace>>,
): DraftRecommendation {
  const goal = draft.suggestedGoal ?? draft.title;
  const suggested = suggestPlaybooksForGoal(playbooks, goal);
  const playbookId = suggested[0]?.id as Id<"playbooks"> | undefined;
  const validationRequirements = generateValidationRequirements({
    goal,
    sources: draft.source === "stripe" ? ["stripe"] : draft.source === "github" ? ["github"] : undefined,
  });
  return {
    ...draft,
    recommendedPlaybookId: draft.recommendedPlaybookId ?? playbookId,
    validationRequirements:
      draft.validationRequirements ??
      (validationRequirements.length > 0 ? validationRequirements : undefined),
  };
}

export async function collectInsightRecommendations(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  projectId?: Id<"projects">,
): Promise<DraftRecommendation[]> {
  const runs = await listInsightRunsForWorkspace(ctx, workspaceId, 5);
  const completedRun = runs.find((run) => run.status === "completed");
  if (!completedRun) return [];

  const findings = await listFindingsForRun(ctx, completedRun.id as Id<"insightRuns">);
  const drafts: DraftRecommendation[] = [];

  for (const finding of findings) {
    if (finding.severity === "info" && finding.type === "summary") continue;

    const goal = finding.recommendation ?? finding.title;
    drafts.push({
      workspaceId,
      projectId: projectId ?? (completedRun.projectId as Id<"projects"> | undefined),
      dedupKey: `insight-finding:${finding.id}`,
      title: finding.title,
      summary: finding.summary,
      type: insightTypeToRecommendationType(finding.type),
      source: "insight",
      priority: priorityFromInsightFinding(finding),
      confidence: confidenceFromSeverity(finding.severity),
      reason: buildRecommendationReasonFromInsight(finding),
      suggestedGoal: goal,
      suggestedWorkstreamTitle: `Investigate: ${finding.title.slice(0, 60)}`,
      evidenceEventIds: finding.evidenceEventIds as Id<"events">[] | undefined,
      evidenceWorkstreamIds: finding.evidenceWorkstreamIds as Id<"workstreams">[] | undefined,
      evidenceInsightFindingIds: [finding.id as Id<"insightFindings">],
    });
  }

  return drafts;
}

export async function collectImpactRecommendations(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  projectId?: Id<"projects">,
): Promise<DraftRecommendation[]> {
  const analyses = (await listImpactAnalysesForWorkspace(ctx, workspaceId, 20)).filter(
    (a) => a.status !== "archived",
  );
  const drafts: DraftRecommendation[] = [];

  for (const analysis of analyses) {
    if (projectId && analysis.projectId && analysis.projectId !== projectId) continue;
    const findings = await listFindingsForAnalysis(ctx, analysis.id as Id<"impactAnalyses">);
    for (const finding of findings) {
      const goal = finding.title;
      drafts.push({
        workspaceId,
        projectId: projectId ?? (analysis.projectId as Id<"projects"> | undefined),
        dedupKey: `impact-finding:${finding.id}`,
        title: finding.title,
        summary: finding.summary,
        type: impactTypeToRecommendationType(finding.type),
        source: "impact_analysis",
        priority: priorityFromImpactFinding(finding),
        confidence: finding.confidence ?? confidenceFromSeverity(finding.severity),
        reason: buildRecommendationReasonFromImpact(finding),
        suggestedGoal: goal,
        suggestedWorkstreamTitle: `Address: ${finding.title.slice(0, 60)}`,
        evidenceEventIds: finding.evidenceEventIds as Id<"events">[] | undefined,
        evidenceWorkstreamIds: finding.evidenceWorkstreamIds as Id<"workstreams">[] | undefined,
        evidenceEntityIds: finding.evidenceEntityIds as Id<"entities">[] | undefined,
        evidenceArtifactIds: finding.evidenceArtifactIds as Id<"artifacts">[] | undefined,
        evidenceImpactAnalysisIds: [analysis.id as Id<"impactAnalyses">],
      });
    }
  }

  return drafts;
}

export async function collectLessonRecommendations(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  projectId?: Id<"projects">,
): Promise<DraftRecommendation[]> {
  const lessons = await listLessonsForWorkspace(ctx, workspaceId, {
    status: "active",
    limit: 50,
  });
  const drafts: DraftRecommendation[] = [];

  for (const lesson of lessons) {
    if (projectId && lesson.projectId && lesson.projectId !== projectId) continue;
    const goal = lesson.recommendation ?? lesson.title;
    const type: Doc<"recommendations">["type"] =
      lesson.type === "validation" ? "validate" : "create_playbook";
    drafts.push({
      workspaceId,
      projectId: projectId ?? (lesson.projectId as Id<"projects"> | undefined),
      dedupKey: `lesson:${lesson.id}`,
      title: `Apply lesson: ${lesson.title}`,
      summary: lesson.summary,
      type,
      source: "lesson",
      priority: lesson.importance === "critical" ? "critical" : lesson.importance === "high" ? "high" : "normal",
      confidence: lesson.confidence,
      reason: buildLessonRecommendationReason(lesson),
      suggestedGoal: goal,
      suggestedWorkstreamTitle: `Validate: ${lesson.title.slice(0, 60)}`,
      evidenceEventIds: lesson.evidenceEventIds as Id<"events">[] | undefined,
      evidenceWorkstreamIds: lesson.evidenceWorkstreamIds as Id<"workstreams">[] | undefined,
      evidenceEntityIds: lesson.evidenceEntityIds as Id<"entities">[] | undefined,
      evidenceLessonIds: [lesson.id as Id<"lessons">],
      evidenceImpactAnalysisIds: lesson.evidenceImpactAnalysisIds as Id<"impactAnalyses">[] | undefined,
      evidenceInsightFindingIds: lesson.evidenceInsightFindingIds as Id<"insightFindings">[] | undefined,
      evidenceArtifactIds: lesson.evidenceArtifactIds as Id<"artifacts">[] | undefined,
    });
  }

  return drafts;
}

export async function collectFailureRecommendations(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  accessible: AccessibleProjects,
  projectId?: Id<"projects">,
): Promise<DraftRecommendation[]> {
  const failures = await collectKnownFailures(ctx, workspaceId, {
    windowMs: DEFAULT_WINDOW_MS,
    projectId,
    accessible,
    limit: 20,
  });

  return failures
    .filter((item) => item.count >= 3)
    .map((item) => {
      const goal = `Stabilize ${item.failureType} failures`;
      return {
        workspaceId,
        projectId,
        dedupKey: `failure:${item.failureType}:project:${projectId ?? "workspace"}`,
        title: item.title,
        summary: item.summary,
        type: "fix" as const,
        source: "known_failure" as const,
        priority: priorityFromKnownFailure(item),
        confidence: item.count >= 5 ? ("strong" as const) : ("likely" as const),
        reason: buildFailureRecommendationReason(item),
        suggestedGoal: goal,
        suggestedWorkstreamTitle: `Fix: ${item.failureType}`,
        evidenceEventIds: item.evidenceEventIds as Id<"events">[],
        validationRequirements: item.recommendedValidation
          ? [{ title: "Run recommended validation", command: item.recommendedValidation, required: true }]
          : undefined,
      } satisfies DraftRecommendation;
    });
}

export async function collectSourceHealthRecommendations(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
): Promise<DraftRecommendation[]> {
  const entries = await collectSourceHealthEntries(ctx, workspaceId);
  const drafts: DraftRecommendation[] = [];

  for (const entry of entries) {
    if (entry.status !== "error" && entry.status !== "not_connected") continue;
    if (entry.status === "not_connected" && entry.hasActiveSecret) continue;

    const source = entry.source as "github" | "stripe" | "posthog";
    const recSource: Doc<"recommendations">["source"] =
      source === "github" ? "github" : source === "stripe" ? "stripe" : "posthog";

    drafts.push({
      workspaceId,
      dedupKey: `source-health:${source}`,
      title: `Investigate ${source} source health`,
      summary: buildSourceHealthReason(source, entry.lastError),
      type: "investigate",
      source: entry.status === "error" ? "source_health" : recSource,
      priority: priorityFromSourceHealth(entry),
      confidence: entry.status === "error" ? "likely" : "possible",
      reason: buildSourceHealthReason(source, entry.lastError),
      suggestedGoal: `Restore ${source} integration health`,
      suggestedWorkstreamTitle: `Investigate ${source} integration`,
      validationRequirements: generateValidationRequirements({
        goal: `${source} webhook integration`,
        sources: [source],
      }),
    });
  }

  return drafts;
}

export async function collectEventSignalRecommendations(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  accessible: AccessibleProjects,
  projectId?: Id<"projects">,
): Promise<DraftRecommendation[]> {
  const end = Date.now();
  const start = end - DEFAULT_WINDOW_MS;
  const events = await listEventsInRange(ctx, workspaceId, start, end, {
    projectId,
    accessibleProjects: accessible,
    scanLimit: 1500,
  });

  const drafts: DraftRecommendation[] = [];
  const stripePayments = events.filter(
    (e) => e.source === "stripe" && /payment_failed|charge\.failed/i.test(e.type),
  );
  if (stripePayments.length >= 2) {
    drafts.push({
      workspaceId,
      projectId,
      dedupKey: `event:stripe:payment_failed:project:${projectId ?? "workspace"}`,
      title: "Payment failures may need investigation",
      summary: `${stripePayments.length} Stripe payment failure events appeared recently.`,
      type: "fix",
      source: "stripe",
      priority: "critical",
      confidence: stripePayments.length >= 3 ? "strong" : "likely",
      reason: "Multiple payment failures may indicate checkout or billing issues.",
      suggestedGoal: "Investigate Stripe payment failures",
      suggestedWorkstreamTitle: "Investigate payment failures",
      evidenceEventIds: stripePayments.slice(0, 10).map((e) => e.id as Id<"events">),
    });
  }

  const githubFailures = events.filter(
    (e) =>
      e.source === "github" &&
      (/check_run\.failed|workflow_run\.failed|pull_request/i.test(e.type) &&
        (e.severity === "error" || /fail/i.test(e.title))),
  );
  if (githubFailures.length >= 2) {
    drafts.push({
      workspaceId,
      projectId,
      dedupKey: `event:github:ci_failure:project:${projectId ?? "workspace"}`,
      title: "GitHub CI failures detected",
      summary: `${githubFailures.length} GitHub failure-related events appeared recently.`,
      type: "fix",
      source: "github",
      priority: "high",
      confidence: "likely",
      reason: "Repeated CI or PR failures may block delivery.",
      suggestedGoal: "Stabilize GitHub CI failures",
      suggestedWorkstreamTitle: "Fix GitHub CI failures",
      evidenceEventIds: githubFailures.slice(0, 10).map((e) => e.id as Id<"events">),
    });
  }

  const posthogSignups = events.filter(
    (e) => e.source === "posthog" && /signup|signed_up|activation/i.test(e.type),
  );
  if (posthogSignups.length >= 5) {
    const sample = posthogSignups[0]!;
    drafts.push({
      workspaceId,
      projectId,
      dedupKey: `event:posthog:signup_spike:project:${projectId ?? "workspace"}`,
      title: "Product signup activity increased",
      summary: `${posthogSignups.length} signup-related PostHog events appeared recently.`,
      type: "improve",
      source: "posthog",
      priority: priorityFromEventType(sample.type, "posthog"),
      confidence: "possible",
      reason: "Signup activity may present an opportunity to review onboarding and conversion.",
      suggestedGoal: "Review signup and activation patterns",
      suggestedWorkstreamTitle: "Review signup activity",
      evidenceEventIds: posthogSignups.slice(0, 10).map((e) => e.id as Id<"events">),
    });
  }

  return drafts;
}

export async function collectAllDraftRecommendations(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  accessible: AccessibleProjects,
  projectId?: Id<"projects">,
): Promise<DraftRecommendation[]> {
  const playbooks = await listPlaybooksForWorkspace(ctx, workspaceId, {
    status: "active",
    limit: 100,
  });

  const batches = await Promise.all([
    collectInsightRecommendations(ctx, workspaceId, projectId),
    collectImpactRecommendations(ctx, workspaceId, projectId),
    collectLessonRecommendations(ctx, workspaceId, projectId),
    collectFailureRecommendations(ctx, workspaceId, accessible, projectId),
    collectSourceHealthRecommendations(ctx, workspaceId),
    collectEventSignalRecommendations(ctx, workspaceId, accessible, projectId),
  ]);

  const merged = batches.flat().map((draft) => attachPlaybookAndValidation(draft, playbooks));

  const seen = new Set<string>();
  return merged.filter((draft) => {
    if (seen.has(draft.dedupKey)) return false;
    seen.add(draft.dedupKey);
    return true;
  });
}

export async function insertDraftRecommendations(
  ctx: DbReadCtx & Pick<import("../_generated/server").MutationCtx, "db">,
  drafts: DraftRecommendation[],
  createdBy?: Doc<"recommendations">["createdBy"],
): Promise<Id<"recommendations">[]> {
  const ids: Id<"recommendations">[] = [];

  for (const draft of drafts) {
    const existing = await findOpenRecommendationByDedupKey(
      ctx,
      draft.workspaceId,
      draft.dedupKey,
    );
    if (existing) continue;

    const id = await createRecommendationDoc(ctx, {
      ...draft,
      status: "open",
      createdBy,
    });
    ids.push(id);
  }

  return ids;
}
