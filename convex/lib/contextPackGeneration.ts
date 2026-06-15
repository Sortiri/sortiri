import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { canViewEvent, canViewWorkstream, getMembershipAndAccessible } from "./authz";
import { docToEntity, searchEntitiesForWorkspace } from "./entitiesLib";
import type { EventRecord } from "./eventsLib";
import { listEventsInRange } from "./impactData";
import {
  docToImpactAnalysis,
  listFindingsForAnalysis,
  listImpactAnalysesForWorkspace,
} from "./impactAnalysesLib";
import {
  listFindingsForRun,
  listInsightRunsForWorkspace,
} from "./insightRunsLib";
import { docToLesson, listLessonsForWorkspace } from "./lessonsLib";
import { docToPlaybook, listPlaybooksForWorkspace, suggestPlaybooksForGoal } from "./playbooksLib";
import {
  docToContextPack,
  type DraftContextPackItem,
  patchContextPackDoc,
  replaceContextPackItems,
} from "./contextPackLib";
import { DEFAULT_CONTEXT_TIME_WINDOW_MS, matchesGoalText, scoreRelevance, filePathMatchesEvent } from "./contextRelevance";
import { collectKnownFailures } from "./knownFailures";
import { generateValidationRequirements } from "./validationRequirements";
import { buildContextPackSummary } from "./contextPackFormat";
import { docToWorkstream, listWorkstreamsForWorkspace } from "./workstreamsLib";
import { isArtifactSafeForAudit, isEventSafeForAudit } from "./sensitiveContent";
import { listEventsByWorkstream } from "./eventsLib";

type DbCtx = Pick<MutationCtx, "db">;

function pushUniqueItem(items: DraftContextPackItem[], item: DraftContextPackItem): void {
  const key = `${item.itemType}:${item.eventId ?? item.workstreamId ?? item.entityId ?? item.lessonId ?? item.playbookId ?? item.impactAnalysisId ?? item.title}`;
  if (items.some((existing) => `${existing.itemType}:${existing.eventId ?? existing.workstreamId ?? existing.entityId ?? existing.lessonId ?? existing.playbookId ?? existing.impactAnalysisId ?? existing.title}` === key)) {
    return;
  }
  items.push(item);
}

export async function generateContextPackItems(
  ctx: DbCtx,
  contextPackId: Id<"contextPacks">,
  clerkUserId: string,
): Promise<{ items: DraftContextPackItem[]; summary: string; counts: NonNullable<ReturnType<typeof docToContextPack>["counts"]> }> {
  const packDoc = await ctx.db.get(contextPackId);
  if (!packDoc) throw new Error("Context pack not found");

  const pack = docToContextPack(packDoc);
  const { accessible } = await getMembershipAndAccessible(ctx, packDoc.workspaceId, clerkUserId);
  const windowMs = pack.request.timeWindowMs ?? DEFAULT_CONTEXT_TIME_WINDOW_MS;
  const end = Date.now();
  const start = end - windowMs;
  const goal = pack.goal;
  const files = pack.request.files ?? [];
  const items: DraftContextPackItem[] = [];
  let order = 0;

  const nextOrder = () => {
    order += 10;
    return order;
  };

  const playbooks = (await listPlaybooksForWorkspace(ctx, packDoc.workspaceId, { status: "active", limit: 50 }))
    .filter((pb) => !pack.projectId || !pb.projectId || pb.projectId === pack.projectId);
  const recommended = suggestPlaybooksForGoal(playbooks, goal)[0];
  if (recommended) {
    pushUniqueItem(items, {
      itemType: "playbook",
      playbookId: recommended.id,
      title: recommended.title,
      summary: recommended.summary,
      reason: "Recommended for this goal",
      importance: "high",
      order: nextOrder(),
    });
  } else if (pack.playbookId) {
    const scoped = await ctx.db.get(pack.playbookId as Id<"playbooks">);
    if (scoped) {
      const playbook = docToPlaybook(scoped);
      pushUniqueItem(items, {
        itemType: "playbook",
        playbookId: playbook.id,
        title: playbook.title,
        summary: playbook.summary,
        reason: "Scoped playbook",
        importance: "high",
        order: nextOrder(),
      });
    }
  }

  const lessons = (await listLessonsForWorkspace(ctx, packDoc.workspaceId, { status: "active", limit: 30 }))
    .filter((lesson) => !pack.projectId || !lesson.projectId || lesson.projectId === pack.projectId)
    .filter((lesson) => matchesGoalText(`${lesson.title} ${lesson.summary}`, goal) || pack.lessonId === lesson.id)
    .slice(0, 8);
  for (const lesson of lessons) {
    pushUniqueItem(items, {
      itemType: "lesson",
      lessonId: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      reason: lesson.recommendation ?? "Evidence-backed learning",
      importance: lesson.importance,
      confidence: lesson.confidence,
      order: nextOrder(),
    });
  }

  let events: EventRecord[] = [];
  if (pack.workstreamId) {
    events = (await listEventsByWorkstream(ctx, pack.workstreamId as Id<"workstreams">)).filter((event) =>
      canViewEvent(event, accessible),
    );
  } else {
    events = await listEventsInRange(ctx, packDoc.workspaceId, start, end, {
      projectId: pack.projectId as Id<"projects"> | undefined,
      accessibleProjects: accessible,
      scanLimit: 1200,
    });
  }

  const decisions = events
    .filter((event) => event.category === "company_decision")
    .filter((event) => isEventSafeForAudit(event))
    .filter((event) => matchesGoalText(`${event.title} ${event.summary ?? ""}`, goal) || pack.projectId)
    .slice(0, 8);
  for (const decision of decisions) {
    pushUniqueItem(items, {
      itemType: "decision",
      eventId: decision.id,
      title: decision.title,
      summary: decision.summary,
      reason: "Recent company decision",
      importance: "high",
      order: nextOrder(),
    });
  }

  const rankedEvents = events
    .filter((event) => isEventSafeForAudit(event))
    .map((event) => ({
      event,
      score:
        scoreRelevance(goal, `${event.title} ${event.summary ?? ""}`) +
        (files.some((file) => filePathMatchesEvent(file, `${event.title} ${event.summary ?? ""}`)) ? 5 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  for (const { event } of rankedEvents) {
    pushUniqueItem(items, {
      itemType: event.category === "company_decision" ? "decision" : "event",
      eventId: event.id,
      title: event.title,
      summary: event.summary,
      reason: "Relevant timeline event",
      order: nextOrder(),
    });
  }

  const workstreams = (await listWorkstreamsForWorkspace(ctx, packDoc.workspaceId, { limit: 40 }))
    .filter((ws) => !pack.projectId || !ws.projectId || ws.projectId === pack.projectId)
    .filter((ws) => pack.workstreamId === ws.id || matchesGoalText(`${ws.title} ${ws.summary ?? ""}`, goal))
    .slice(0, 8);
  for (const ws of workstreams) {
    if (!canViewWorkstream(ws, accessible)) continue;
    pushUniqueItem(items, {
      itemType: "workstream",
      workstreamId: ws.id,
      title: ws.title,
      summary: ws.summary,
      reason: "Related workstream",
      order: nextOrder(),
    });
  }

  if (pack.workstreamId) {
    const wsDoc = await ctx.db.get(pack.workstreamId as Id<"workstreams">);
    if (wsDoc) {
      const ws = docToWorkstream(wsDoc);
      pushUniqueItem(items, {
        itemType: "workstream",
        workstreamId: ws.id,
        title: ws.title,
        summary: ws.summary,
        reason: "Scoped workstream",
        importance: "high",
        order: 5,
      });
    }
  }

  const entityQuery = [goal, ...(pack.request.entities ?? []), ...files].join(" ");
  const entities = (
    await searchEntitiesForWorkspace(ctx, packDoc.workspaceId, {
      query: entityQuery,
      limit: 12,
    })
  );
  if (pack.entityId) {
    const entityDoc = await ctx.db.get(pack.entityId as Id<"entities">);
    if (entityDoc) {
      const entity = docToEntity(entityDoc);
      pushUniqueItem(items, {
        itemType: "entity",
        entityId: entity.id,
        title: entity.name,
        summary: `${entity.type} entity`,
        reason: "Scoped entity",
        importance: "high",
        order: nextOrder(),
      });
    }
  }
  for (const entity of entities) {
    pushUniqueItem(items, {
      itemType: "entity",
      entityId: entity.id,
      title: entity.name,
      summary: entity.type,
      reason: "Matched entity",
      order: nextOrder(),
    });
  }

  const failures = await collectKnownFailures(ctx, packDoc.workspaceId, {
    windowMs,
    goal,
    files,
    projectId: pack.projectId as Id<"projects"> | undefined,
    accessible,
    limit: 8,
  });
  for (const failure of failures) {
    pushUniqueItem(items, {
      itemType: "known_failure",
      title: failure.title,
      summary: failure.summary,
      reason: `${failure.count} occurrences; last seen ${new Date(failure.lastSeenAt).toISOString()}`,
      importance: "high",
      order: nextOrder(),
    });
  }

  const impacts = (await listImpactAnalysesForWorkspace(ctx, packDoc.workspaceId, 30))
    .filter((analysis) => analysis.status !== "archived")
    .filter((analysis) => !pack.projectId || !analysis.projectId || analysis.projectId === pack.projectId)
    .filter((analysis) => pack.impactAnalysisId === analysis.id || matchesGoalText(`${analysis.title} ${analysis.summary ?? ""}`, goal))
    .slice(0, 6);
  for (const analysis of impacts) {
    const findings = await listFindingsForAnalysis(ctx, analysis.id as Id<"impactAnalyses">);
    const topFinding = findings[0];
    pushUniqueItem(items, {
      itemType: "impact_analysis",
      impactAnalysisId: analysis.id,
      title: analysis.title,
      summary: topFinding?.summary ?? analysis.summary ?? analysis.anchor.title,
      reason: "Impact analysis context",
      importance: "high",
      order: nextOrder(),
    });
  }

  const runs = await listInsightRunsForWorkspace(ctx, packDoc.workspaceId, 5);
  const completedRun = runs.find((run) => run.status === "completed");
  if (completedRun) {
    const findings = await listFindingsForRun(ctx, completedRun.id as Id<"insightRuns">);
    for (const finding of findings.slice(0, 6)) {
      if (!matchesGoalText(`${finding.title} ${finding.summary}`, goal) && findings.length > 3) continue;
      pushUniqueItem(items, {
        itemType: "insight",
        insightFindingId: finding.id,
        title: finding.title,
        summary: finding.summary,
        reason: "Insight finding",
        importance: finding.severity === "critical" ? "critical" : "normal",
        order: nextOrder(),
      });
    }
  }

  for (const event of events) {
    if (!event.artifactIds?.length) continue;
    for (const artifactId of event.artifactIds.slice(0, 2)) {
      const artifact = await ctx.db.get(artifactId as Id<"artifacts">);
      if (!artifact || !isArtifactSafeForAudit(artifact)) continue;
      const text = `${artifact.title} ${artifact.summary ?? ""}`;
      if (!matchesGoalText(text, goal) && !files.some((file) => filePathMatchesEvent(file, text))) continue;
      pushUniqueItem(items, {
        itemType: "artifact",
        artifactId: artifact._id,
        title: artifact.title,
        summary:
          artifact.redactionStatus === "redacted"
            ? "This evidence was redacted before storage."
            : artifact.summary,
        reason: "Safe artifact evidence",
        order: nextOrder(),
      });
    }
  }

  const validationRequirements = generateValidationRequirements({
    goal,
    files,
    sources: pack.request.sources,
  });
  for (const req of validationRequirements) {
    pushUniqueItem(items, {
      itemType: "validation_requirement",
      title: req.title,
      summary: req.command ?? req.reason,
      reason: req.reason,
      importance: req.required ? "high" : "normal",
      order: nextOrder(),
    });
  }

  const counts = {
    events: items.filter((item) => item.itemType === "event").length,
    workstreams: items.filter((item) => item.itemType === "workstream").length,
    entities: items.filter((item) => item.itemType === "entity").length,
    decisions: items.filter((item) => item.itemType === "decision").length,
    impacts: items.filter((item) => item.itemType === "impact_analysis").length,
    lessons: items.filter((item) => item.itemType === "lesson").length,
    playbooks: items.filter((item) => item.itemType === "playbook").length,
    insights: items.filter((item) => item.itemType === "insight").length,
    artifacts: items.filter((item) => item.itemType === "artifact").length,
    failures: items.filter((item) => item.itemType === "known_failure").length,
    validationRequirements: items.filter((item) => item.itemType === "validation_requirement").length,
  };

  const summary = buildContextPackSummary(pack, items as never);
  await replaceContextPackItems(ctx, contextPackId, packDoc.workspaceId, items);
  await patchContextPackDoc(ctx, contextPackId, {
    status: "generated",
    summary,
    counts,
  });

  return { items, summary, counts };
}
