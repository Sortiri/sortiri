import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { docToEntity, type EntityRecord } from "./entitiesLib";
import { docToEvent, type EventRecord } from "./eventsLib";
import {
  applyViewFilters,
  buildEntityKeyLookup,
  type SavedViewFilters,
} from "./viewFilters";

type DbReadCtx = Pick<QueryCtx, "db">;

const DEFAULT_SCAN_LIMIT = 500;

export async function fetchWorkspaceEvents(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options: {
    limit?: number;
    scanLimit?: number;
    windowStart?: number;
  } = {},
): Promise<EventRecord[]> {
  const scanLimit = options.scanLimit ?? DEFAULT_SCAN_LIMIT;
  const docs = await ctx.db
    .query("events")
    .withIndex("by_workspace_occurred_at", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .take(scanLimit);

  let events = docs.map(docToEvent);
  if (options.windowStart !== undefined) {
    events = events.filter((event) => event.occurredAt >= options.windowStart!);
  }
  if (options.limit !== undefined) {
    events = events.slice(0, options.limit);
  }
  return events;
}

async function loadEntityLookup(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  filters: SavedViewFilters,
) {
  if (!filters.entityIds || filters.entityIds.length === 0) {
    return undefined;
  }

  const entities = await Promise.all(
    filters.entityIds.map(async (entityId) => {
      const doc = await ctx.db.get(entityId);
      if (!doc || doc.workspaceId !== workspaceId) {
        return null;
      }
      return docToEntity(doc);
    }),
  );

  return buildEntityKeyLookup(
    entities.filter((entity): entity is EntityRecord => entity !== null),
  );
}

export async function applySavedViewFilters(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  filters: SavedViewFilters,
  options: {
    limit?: number;
    windowStart?: number;
    scanLimit?: number;
  } = {},
): Promise<EventRecord[]> {
  const entityLookup = await loadEntityLookup(ctx, workspaceId, filters);
  const events = await fetchWorkspaceEvents(ctx, workspaceId, options);
  const filtered = applyViewFilters(events, filters, entityLookup);
  if (options.limit !== undefined) {
    return filtered.slice(0, options.limit);
  }
  return filtered;
}

export async function loadSavedViewFilters(
  ctx: DbReadCtx,
  viewId: Id<"savedViews">,
  workspaceId: Id<"workspaces">,
): Promise<SavedViewFilters | null> {
  const view = await ctx.db.get(viewId);
  if (!view || view.workspaceId !== workspaceId) {
    return null;
  }
  return view.filters as SavedViewFilters;
}
