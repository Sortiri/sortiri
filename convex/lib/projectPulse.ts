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
import { getStartOfUtcDay } from "./homePulse";
import { getProjectEventStats } from "./projectsLib";
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
  decisionCandidates: number;
  incidents: number;
  deployFailures: number;
  rollbacks: number;
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
  tableCounts?: {
    decisions?: number;
    candidates?: number;
    incidents?: number;
    deployFailures?: number;
    rollbacks?: number;
  },
): ProjectPulseCounts {
  const eventDecisions = events.filter(
    (e) => e.category === "company_decision" || e.category === "decision",
  ).length;
  return {
    totalEvents: events.length,
    agentActions: events.filter((e) => e.category === "agent_action").length,
    codeChanges: events.filter((e) => e.category === "code_change").length,
    productEvents: events.filter((e) => e.category === "product_event").length,
    decisions: tableCounts?.decisions ?? eventDecisions,
    decisionCandidates: tableCounts?.candidates ?? 0,
    incidents: tableCounts?.incidents ?? 0,
    deployFailures:
      tableCounts?.deployFailures ??
      events.filter((e) => e.type.includes("deploy_failed")).length,
    rollbacks: tableCounts?.rollbacks ?? 0,
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

  const decisionDocs = await ctx.db
    .query("decisions")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  const windowDecisions = decisionDocs.filter(
    (d) => d.decidedAt >= windowStart && d.status !== "archived",
  );

  const candidateDocs = await ctx.db
    .query("decisionCandidates")
    .withIndex("by_workspace_status", (q) =>
      q.eq("workspaceId", workspaceId).eq("status", "pending"),
    )
    .collect();
  const projectCandidates = candidateDocs.filter(
    (c) => c.projectId === projectId && c.createdAt >= windowStart,
  );

  const rollbackDocs = await ctx.db
    .query("rollbackEvents")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  const windowRollbacks = rollbackDocs.filter((r) => r.rolledBackAt >= windowStart);

  const incidentDocs = await ctx.db
    .query("incidents")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  const windowIncidents = incidentDocs.filter((i) => i.startedAt >= windowStart);

  const deployFailureDocs = await ctx.db
    .query("observabilitySignals")
    .withIndex("by_workspace_type", (q) =>
      q.eq("workspaceId", workspaceId).eq("signalType", "deploy_failed"),
    )
    .collect();
  const windowDeployFailures = deployFailureDocs.filter(
    (s) => s.projectId === projectId && s.occurredAt >= windowStart,
  );

  return {
    counts: buildProjectPulseCounts(windowEvents, activeWorkstreams, {
      decisions: windowDecisions.length,
      candidates: projectCandidates.length,
      incidents: windowIncidents.length,
      deployFailures: windowDeployFailures.length,
      rollbacks: windowRollbacks.length,
    }),
    recentEvents,
    recentWorkstreams,
    activeWorkstreams,
    topEntities,
    recentFindings,
  };
}

const OPEN_INCIDENT_STATUSES = new Set(["open", "investigating", "mitigated"]);

export type ActiveProjectSummary = {
  projectId: string;
  name: string;
  eventsToday: number;
  activeWorkstreams: number;
  openIncidents: number;
  connectedSources: string[];
  lastEventAt?: number;
};

export type ProjectListSummary = ActiveProjectSummary & {
  description?: string;
  repositoryUrl?: string;
  status: "active" | "archived" | "paused";
  pendingDecisions: number;
};

export async function listProjectSummariesForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options: { status?: "active" | "archived" | "all"; limit?: number } = {},
): Promise<ProjectListSummary[]> {
  const startOfToday = getStartOfUtcDay();
  const statusFilter = options.status ?? "all";

  const projectDocs = await ctx.db
    .query("projects")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const filtered =
    statusFilter === "all"
      ? projectDocs
      : projectDocs.filter((p) => (p.status ?? "active") === statusFilter);

  const summaries: ProjectListSummary[] = [];

  for (const project of filtered) {
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

    const incidentDocs = await ctx.db
      .query("incidents")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const openIncidents = incidentDocs.filter((incident) =>
      OPEN_INCIDENT_STATUSES.has(incident.status),
    ).length;

    const decisionDocs = await ctx.db
      .query("decisionCandidates")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const pendingDecisions = decisionDocs.filter((d) => d.status === "pending").length;

    const connectedSources = [...new Set(eventDocs.map((event) => event.source))].sort();

    summaries.push({
      projectId: project._id,
      name: project.name,
      description: project.description,
      repositoryUrl: project.repositoryUrl,
      status: (project.status ?? "active") as ProjectListSummary["status"],
      eventsToday,
      activeWorkstreams: workstreams.length,
      openIncidents,
      pendingDecisions,
      connectedSources,
      lastEventAt: stats.lastEventAt,
    });
  }

  const sorted = summaries.sort((a, b) => (b.lastEventAt ?? 0) - (a.lastEventAt ?? 0));
  return options.limit ? sorted.slice(0, options.limit) : sorted;
}

export async function getActiveProjectsForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  limit = 3,
): Promise<ActiveProjectSummary[]> {
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

    const incidentDocs = await ctx.db
      .query("incidents")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const openIncidents = incidentDocs.filter((incident) =>
      OPEN_INCIDENT_STATUSES.has(incident.status),
    ).length;

    const connectedSources = [...new Set(eventDocs.map((event) => event.source))].sort();

    summaries.push({
      projectId: project._id,
      name: project.name,
      eventsToday,
      activeWorkstreams: workstreams.length,
      openIncidents,
      connectedSources,
      lastEventAt: stats.lastEventAt,
    });
  }

  return summaries
    .sort((a, b) => (b.lastEventAt ?? 0) - (a.lastEventAt ?? 0))
    .slice(0, limit);
}
