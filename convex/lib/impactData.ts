import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { canViewEvent } from "./authz";
import { docToEvent, type EventRecord } from "./eventsLib";
import { isMetaInsightEvent } from "./insightData";
import type { AccessibleProjects } from "./projectAccessLib";
import { intersectProjectIds } from "./projectAccessLib";
import { applyViewFilters, type SavedViewFilters } from "./viewFilters";
import type { Doc } from "../_generated/dataModel";

type DbReadCtx = Pick<QueryCtx, "db">;

const DEFAULT_SCAN_LIMIT = 1000;

export type ImpactAnalysisFilters = NonNullable<Doc<"impactAnalyses">["filters"]>;

function toSavedViewFilters(filters?: ImpactAnalysisFilters): SavedViewFilters | undefined {
  if (!filters) return undefined;
  return {
    projectIds: filters.projectIds,
    categories: filters.categories as SavedViewFilters["categories"],
    sources: filters.sources,
    entityTypes: filters.entityTypes,
    visibility: filters.visibility === "primary" ? "primary" : "all",
  };
}

function applyImpactFilters(
  events: EventRecord[],
  filters?: ImpactAnalysisFilters,
  accessibleProjects?: AccessibleProjects,
): EventRecord[] {
  let viewFilters = toSavedViewFilters(filters);
  if (accessibleProjects && accessibleProjects !== "all" && viewFilters?.projectIds) {
    const intersected = intersectProjectIds(viewFilters.projectIds, accessibleProjects);
    viewFilters = {
      ...viewFilters,
      projectIds: intersected && intersected.length > 0 ? intersected : undefined,
    };
  }

  let filtered = events.filter((event) => !isMetaInsightEvent(event));

  if (accessibleProjects) {
    filtered = filtered.filter((event) => canViewEvent(event, accessibleProjects));
  }

  if (viewFilters) {
    filtered = applyViewFilters(filtered, viewFilters);
  }

  if (filters?.visibility === "primary") {
    filtered = filtered.filter(
      (event) => !event.visibility || event.visibility === "primary",
    );
  }

  return filtered;
}

export async function listEventsInRange(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  start: number,
  end: number,
  options: {
    scanLimit?: number;
    projectId?: Id<"projects">;
    filters?: ImpactAnalysisFilters;
    accessibleProjects?: AccessibleProjects;
  } = {},
): Promise<EventRecord[]> {
  const scanLimit = options.scanLimit ?? DEFAULT_SCAN_LIMIT;

  let docs;
  if (options.projectId) {
    docs = await ctx.db
      .query("events")
      .withIndex("by_project", (q) => q.eq("projectId", options.projectId!))
      .order("desc")
      .take(scanLimit);
  } else {
    docs = await ctx.db
      .query("events")
      .withIndex("by_workspace_occurred_at", (q) => q.eq("workspaceId", workspaceId))
      .order("desc")
      .take(scanLimit);
  }

  const inRange = docs
    .filter((doc) => doc.occurredAt >= start && doc.occurredAt < end)
    .map(docToEvent);

  return applyImpactFilters(inRange, options.filters, options.accessibleProjects);
}

export type ImpactWindowEvents = {
  baseline: EventRecord[];
  impact: EventRecord[];
  truncated: boolean;
};

export async function collectBaselineAndImpactEvents(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  window: Doc<"impactAnalyses">["window"],
  options: {
    projectId?: Id<"projects">;
    filters?: ImpactAnalysisFilters;
    accessibleProjects?: AccessibleProjects;
    scanLimit?: number;
  } = {},
): Promise<ImpactWindowEvents> {
  const scanLimit = options.scanLimit ?? DEFAULT_SCAN_LIMIT;

  const [baseline, impact] = await Promise.all([
    listEventsInRange(ctx, workspaceId, window.baselineStart, window.baselineEnd, {
      ...options,
      scanLimit,
    }),
    listEventsInRange(ctx, workspaceId, window.impactStart, window.impactEnd, {
      ...options,
      scanLimit,
    }),
  ]);

  const truncated =
    baseline.length >= scanLimit || impact.length >= scanLimit;

  return { baseline, impact, truncated };
}
