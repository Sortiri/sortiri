import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { filterPrimaryEventRecords } from "./eventDisplay";
import {
  docToEntity,
  extractEntitiesFromEvent,
  isPrimaryEntityType,
  normalizeEntityKey,
  type EntityRecord,
} from "./entitiesLib";
import { listEventsForWorkspace, type EventRecord } from "./eventsLib";
import {
  hydrateFindingEvidence,
  listFindingsForRun,
  listInsightRunsForWorkspace,
  type InsightFindingDetail,
} from "./insightRunsLib";
import {
  listWorkstreamsForWorkspace,
  type WorkstreamRecord,
} from "./workstreamsLib";

type DbReadCtx = Pick<QueryCtx, "db">;

export type ProjectPulseWindow = "24h" | "7d" | "30d";

export type ProjectPulseCounts = {
  totalEvents: number;
  agentActions: number;
  codeChanges: number;
  productEvents: number;
  decisions: number;
  revenueEvents: number;
  systemEvents: number;
  activeWorkstreams: number;
};

export type ProjectPulseResult = {
  counts: ProjectPulseCounts;
  recentEvents: EventRecord[];
  recentWorkstreams: WorkstreamRecord[];
  activeWorkstreams: WorkstreamRecord[];
  topEntities: EntityRecord[];
  recentFindings: InsightFindingDetail[];
};

const WINDOW_MS: Record<ProjectPulseWindow, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function getProjectWindowStart(
  window: ProjectPulseWindow = "7d",
  now = Date.now(),
): number {
  return now - WINDOW_MS[window];
}

export function buildProjectPulseCounts(
  events: EventRecord[],
  activeWorkstreams: WorkstreamRecord[],
): ProjectPulseCounts {
  return {
    totalEvents: events.length,
    agentActions: events.filter((e) => e.category === "agent_action").length,
    codeChanges: events.filter((e) => e.category === "code_change").length,
    productEvents: events.filter((e) => e.category === "product_event").length,
    decisions: events.filter((e) => e.category === "company_decision").length,
    revenueEvents: events.filter((e) => e.category === "revenue_event").length,
    systemEvents: events.filter((e) => e.category === "system_event").length,
    activeWorkstreams: activeWorkstreams.length,
  };
}

export async function listProjectEvents(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
  options: { limit?: number; visibility?: "primary" | "all" } = {},
): Promise<EventRecord[]> {
  return listEventsForWorkspace(ctx, workspaceId, {
    projectId,
    limit: options.limit ?? 500,
    scanLimit: options.limit ?? 500,
    visibility: options.visibility ?? "primary",
  });
}

export async function listEntitiesByProject(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
  options: { type?: EntityRecord["type"]; limit?: number } = {},
): Promise<EntityRecord[]> {
  const limit = options.limit ?? 10;

  const projectEvents = await listProjectEvents(ctx, workspaceId, projectId, {
    limit: 500,
    visibility: "primary",
  });

  if (projectEvents.length === 0) {
    return [];
  }

  const entityHits = new Map<
    string,
    { type: EntityRecord["type"]; key: string; count: number; lastSeenAt: number }
  >();

  for (const event of projectEvents) {
    const candidates = extractEntitiesFromEvent({
      source: event.source,
      category: event.category,
      type: event.type,
      actor: event.actor,
      title: event.title,
      entity: event.entity,
      data: event.data,
    });

    for (const candidate of candidates) {
      if (options.type && candidate.type !== options.type) continue;
      if (!isPrimaryEntityType(candidate.type)) continue;

      const mapKey = `${candidate.type}:${normalizeEntityKey(candidate.type, candidate.key)}`;
      const existing = entityHits.get(mapKey);
      if (existing) {
        existing.count += 1;
        existing.lastSeenAt = Math.max(existing.lastSeenAt, event.occurredAt);
      } else {
        entityHits.set(mapKey, {
          type: candidate.type,
          key: candidate.key,
          count: 1,
          lastSeenAt: event.occurredAt,
        });
      }
    }
  }

  const ranked = [...entityHits.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.lastSeenAt - a.lastSeenAt;
  });

  const results: EntityRecord[] = [];
  for (const hit of ranked.slice(0, limit * 2)) {
    const entityDoc = await ctx.db
      .query("entities")
      .withIndex("by_workspace_type_key", (q) =>
        q
          .eq("workspaceId", workspaceId)
          .eq("type", hit.type)
          .eq("key", hit.key),
      )
      .first();

    if (entityDoc) {
      const record = docToEntity(entityDoc);
      results.push({
        ...record,
        eventCount: hit.count,
        lastSeenAt: hit.lastSeenAt,
      });
    }
    if (results.length >= limit) break;
  }

  return results;
}

export async function buildProjectPulse(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
  window: ProjectPulseWindow = "7d",
): Promise<ProjectPulseResult> {
  const windowStart = getProjectWindowStart(window);

  const allProjectEvents = await listProjectEvents(ctx, workspaceId, projectId, {
    limit: 500,
    visibility: "primary",
  });

  const windowEvents = filterPrimaryEventRecords(
    allProjectEvents.filter((e) => e.occurredAt >= windowStart),
  );

  const recentEvents = windowEvents.slice(0, 20);

  const activeWorkstreams = await listWorkstreamsForWorkspace(ctx, workspaceId, {
    projectId,
    status: "active",
    limit: 10,
  });

  const recentWorkstreams = await listWorkstreamsForWorkspace(ctx, workspaceId, {
    projectId,
    limit: 10,
  });

  const topEntities =
    allProjectEvents.length > 0
      ? await listEntitiesByProject(ctx, workspaceId, projectId, { limit: 10 })
      : [];

  const runs = await listInsightRunsForWorkspace(ctx, workspaceId, 20);
  const projectRuns = runs.filter((run) => run.projectId === projectId);
  const latestRun = projectRuns.find((run) => run.status === "completed");

  let recentFindings: InsightFindingDetail[] = [];
  if (latestRun) {
    const findings = await listFindingsForRun(ctx, latestRun.id as Id<"insightRuns">);
    const topFindings = findings.slice(0, 3);
    recentFindings = await Promise.all(
      topFindings.map((finding) => hydrateFindingEvidence(ctx, finding)),
    );
  }

  return {
    counts: buildProjectPulseCounts(windowEvents, activeWorkstreams),
    recentEvents,
    recentWorkstreams,
    activeWorkstreams,
    topEntities,
    recentFindings,
  };
}

export type ActiveProjectSummary = {
  projectId: string;
  name: string;
  eventsToday: number;
  activeWorkstreams: number;
  lastEventAt?: number;
};

export async function getActiveProjectsForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  limit = 3,
): Promise<ActiveProjectSummary[]> {
  const { getStartOfUtcDay } = await import("./homePulse");
  const { getProjectEventStats } = await import("./projectsLib");
  const startOfToday = getStartOfUtcDay();

  const projectDocs = await ctx.db
    .query("projects")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const active = projectDocs.filter((p) => (p.status ?? "active") === "active");

  const summaries: ActiveProjectSummary[] = [];

  for (const project of active) {
    const stats = await getProjectEventStats(ctx, workspaceId, project._id);
    const eventDocs = await ctx.db
      .query("events")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const eventsToday = eventDocs.filter((e) => e.occurredAt >= startOfToday).length;

    const workstreams = await listWorkstreamsForWorkspace(ctx, workspaceId, {
      projectId: project._id,
      status: "active",
      limit: 100,
    });

    summaries.push({
      projectId: project._id,
      name: project.name,
      eventsToday,
      activeWorkstreams: workstreams.length,
      lastEventAt: stats.lastEventAt,
    });
  }

  return summaries
    .sort((a, b) => (b.lastEventAt ?? 0) - (a.lastEventAt ?? 0))
    .slice(0, limit);
}
