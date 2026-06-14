import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { EventRecord } from "./eventsLib";
import { listEventsForWorkspace } from "./eventsLib";
import { filterPrimaryEventRecords } from "./eventDisplay";
import { isMetaInsightEvent, listEventsInWindow } from "./insightData";
import {
  hydrateFindingEvidence,
  listFindingsForRun,
  listInsightRunsForWorkspace,
  type InsightFindingDetail,
  type InsightRunRecord,
} from "./insightRunsLib";
import { listPinnedForWorkspace, type PinnedReplayWithWorkstream } from "./pinnedReplaysLib";
import { listViewsForWorkspace, type SavedViewRecord } from "./savedViewsLib";
import { applySavedViewFilters } from "./savedViewEvents";
import { buildViewPulseCounts, getViewWindowStart } from "./viewFilters";
import { getWorkspaceMembership } from "./authz";
import {
  listWorkstreamsForWorkspace,
  type WorkstreamRecord,
} from "./workstreamsLib";

type DbReadCtx = Pick<QueryCtx, "db">;

const TRACKED_SOURCES = [
  "cursor",
  "watcher",
  "cli",
  "sdk",
  "manual",
  "system",
  "github",
] as const;

export type SourceHealthItem = {
  source: string;
  connected: boolean;
  eventCount: number;
  lastEventAt?: number;
};

export type PulseCounts = {
  eventsToday: number;
  agentActionsToday: number;
  codeChangesToday: number;
  productEventsToday: number;
  activeWorkstreams: number;
  connectedSources: number;
};

export type PinnedViewSummary = {
  view: SavedViewRecord;
  eventsToday: number;
  summary: string;
};

export type CompanyPulseResult = {
  counts: PulseCounts;
  recentEvents: EventRecord[];
  activeWorkstreams: WorkstreamRecord[];
  pinnedReplays: PinnedReplayWithWorkstream[];
  pinnedViews: PinnedViewSummary[];
  latestFindings: InsightFindingDetail[];
  latestInsightRun?: InsightRunRecord;
  sourceStatus: SourceHealthItem[];
  isEmpty: boolean;
};

/** UTC midnight for V1 "today" window. Local timezone support is a future enhancement. */
export function getStartOfUtcDay(now = Date.now()): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function buildPulseCounts(
  todayEvents: EventRecord[],
  activeWorkstreams: WorkstreamRecord[],
  sourceStatus: SourceHealthItem[],
): PulseCounts {
  return {
    eventsToday: todayEvents.length,
    agentActionsToday: todayEvents.filter((e) => e.category === "agent_action").length,
    codeChangesToday: todayEvents.filter((e) => e.category === "code_change").length,
    productEventsToday: todayEvents.filter((e) => e.category === "product_event").length,
    activeWorkstreams: activeWorkstreams.length,
    connectedSources: sourceStatus.filter((s) => s.connected).length,
  };
}

export async function getSourceStatusForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
): Promise<SourceHealthItem[]> {
  const statuses: SourceHealthItem[] = [];

  for (const source of TRACKED_SOURCES) {
    const docs = await ctx.db
      .query("events")
      .withIndex("by_source", (q) =>
        q.eq("workspaceId", workspaceId).eq("source", source),
      )
      .collect();

    const eventCount = docs.length;
    const lastEventAt =
      eventCount > 0
        ? docs.reduce(
            (max, doc) => (doc.occurredAt > max ? doc.occurredAt : max),
            docs[0]!.occurredAt,
          )
        : undefined;

    statuses.push({
      source,
      connected: eventCount > 0,
      eventCount,
      lastEventAt,
    });
  }

  return statuses;
}

export async function buildCompanyPulse(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  clerkUserId?: string,
): Promise<CompanyPulseResult> {
  const startOfToday = getStartOfUtcDay();

  const todayEvents = filterPrimaryEventRecords(
    (await listEventsInWindow(ctx, workspaceId, startOfToday)).filter(
      (event) => !isMetaInsightEvent(event),
    ),
  );

  const recentEvents = await listEventsForWorkspace(ctx, workspaceId, {
    limit: 5,
    visibility: "primary",
  });

  const activeWorkstreams = await listWorkstreamsForWorkspace(ctx, workspaceId, {
    status: "active",
    limit: 5,
  });

  const pinnedReplays = await listPinnedForWorkspace(ctx, workspaceId, 10);

  let pinnedViews: PinnedViewSummary[] = [];
  if (clerkUserId) {
    const membership = await getWorkspaceMembership(ctx, workspaceId, clerkUserId);
    if (membership) {
      const views = (await listViewsForWorkspace(ctx, workspaceId, membership)).filter(
        (view) => view.isPinned,
      );
      const windowStart = getViewWindowStart("24h");
      pinnedViews = await Promise.all(
        views.slice(0, 5).map(async (view) => {
          const events = await applySavedViewFilters(ctx, workspaceId, view.filters, {
            windowStart,
          });
          const counts = buildViewPulseCounts(events);
          const parts: string[] = [];
          if (counts.totalEvents > 0) {
            parts.push(`${counts.totalEvents} event${counts.totalEvents === 1 ? "" : "s"} today`);
          }
          if (counts.codeChanges > 0) {
            parts.push(`${counts.codeChanges} code change${counts.codeChanges === 1 ? "" : "s"}`);
          }
          if (counts.productEvents > 0) {
            parts.push(`${counts.productEvents} product event${counts.productEvents === 1 ? "" : "s"}`);
          }
          if (counts.revenueEvents > 0) {
            parts.push(`${counts.revenueEvents} revenue event${counts.revenueEvents === 1 ? "" : "s"}`);
          }
          if (counts.decisions > 0) {
            parts.push(`${counts.decisions} decision${counts.decisions === 1 ? "" : "s"}`);
          }
          return {
            view,
            eventsToday: counts.totalEvents,
            summary: parts.length > 0 ? parts.join(" · ") : "No matching events today",
          };
        }),
      );
    }
  }

  const sourceStatus = await getSourceStatusForWorkspace(ctx, workspaceId);

  const counts = buildPulseCounts(todayEvents, activeWorkstreams, sourceStatus);

  const runs = await listInsightRunsForWorkspace(ctx, workspaceId, 5);
  const latestInsightRun = runs.find((run) => run.status === "completed");

  let latestFindings: InsightFindingDetail[] = [];
  if (latestInsightRun) {
    const findings = await listFindingsForRun(ctx, latestInsightRun.id as Id<"insightRuns">);
    const topFindings = findings.slice(0, 3);
    latestFindings = await Promise.all(
      topFindings.map((finding) => hydrateFindingEvidence(ctx, finding)),
    );
  }

  const isEmpty = counts.eventsToday === 0 && recentEvents.length === 0;

  return {
    counts,
    recentEvents,
    activeWorkstreams,
    pinnedReplays,
    pinnedViews,
    latestFindings,
    latestInsightRun,
    sourceStatus,
    isEmpty,
  };
}
