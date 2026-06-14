import type { Id } from "../_generated/dataModel";
import type { EventRecord } from "./eventsLib";
import type { InsightWindow } from "./insightWindow";
import { windowToMs } from "./insightWindow";
import type { EventCategory } from "./eventTypes";

export type SavedViewFilters = {
  projectIds?: Id<"projects">[];
  categories?: EventCategory[];
  sources?: string[];
  entityTypes?: string[];
  entityIds?: Id<"entities">[];
  actorTypes?: string[];
  importance?: Array<"low" | "normal" | "high" | "critical">;
  visibility?: "primary" | "debug" | "all";
  query?: string;
};

export type EntityKeyLookup = Map<string, { type: string; key: string }>;

export function buildEntityKeyLookup(
  entities: Array<{ id: string; type: string; key: string }>,
): EntityKeyLookup {
  const lookup = new Map<string, { type: string; key: string }>();
  for (const entity of entities) {
    lookup.set(entity.id, { type: entity.type, key: entity.key });
  }
  return lookup;
}

export function eventMatchesViewFilters(
  event: EventRecord,
  filters: SavedViewFilters,
  entityLookup?: EntityKeyLookup,
): boolean {
  if (filters.projectIds && filters.projectIds.length > 0) {
    if (!event.projectId || !filters.projectIds.includes(event.projectId as Id<"projects">)) {
      return false;
    }
  }

  if (filters.categories && filters.categories.length > 0) {
    if (!filters.categories.includes(event.category)) {
      return false;
    }
  }

  if (filters.sources && filters.sources.length > 0) {
    if (!filters.sources.includes(event.source)) {
      return false;
    }
  }

  if (filters.entityTypes && filters.entityTypes.length > 0) {
    const entityType = event.entity?.type;
    if (!entityType || !filters.entityTypes.includes(entityType)) {
      return false;
    }
  }

  if (filters.entityIds && filters.entityIds.length > 0 && entityLookup) {
    const eventEntity = event.entity;
    if (!eventEntity?.type) {
      return false;
    }
    const matchesEntity = filters.entityIds.some((entityId) => {
      const entity = entityLookup.get(entityId);
      if (!entity) return false;
      if (entity.type !== eventEntity.type) return false;
      if (eventEntity.id && entity.key === eventEntity.id) return true;
      if (eventEntity.name && entity.key === eventEntity.name) return true;
      return false;
    });
    if (!matchesEntity) {
      return false;
    }
  }

  if (filters.actorTypes && filters.actorTypes.length > 0) {
    if (!filters.actorTypes.includes(event.actor.type)) {
      return false;
    }
  }

  if (filters.importance && filters.importance.length > 0) {
    const importance = event.importance ?? "normal";
    if (!filters.importance.includes(importance)) {
      return false;
    }
  }

  const visibilityMode = filters.visibility ?? "primary";
  if (!matchesSavedViewVisibility(event, visibilityMode)) {
    return false;
  }

  if (filters.query?.trim()) {
    const normalizedQuery = filters.query.trim().toLowerCase();
    const haystack = [
      event.title,
      event.summary,
      event.type,
      event.category,
      event.source,
      event.actor.name,
      event.actor.id,
      event.entity?.name,
      event.entity?.type,
      ...(event.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(normalizedQuery)) {
      return false;
    }
  }

  return true;
}

export function applyViewFilters(
  events: EventRecord[],
  filters: SavedViewFilters,
  entityLookup?: EntityKeyLookup,
): EventRecord[] {
  return events.filter((event) => eventMatchesViewFilters(event, filters, entityLookup));
}

function matchesSavedViewVisibility(
  event: EventRecord,
  mode: NonNullable<SavedViewFilters["visibility"]>,
): boolean {
  if (event.isUserHidden) {
    return false;
  }

  const visibility = event.visibility ?? "primary";
  if (visibility === "hidden") {
    return false;
  }

  if (mode === "all") {
    return true;
  }

  if (mode === "debug") {
    return visibility === "debug" || visibility === "primary" || event.isUserPinned === true;
  }

  return visibility === "primary" || event.isUserPinned === true;
}

export function getViewWindowStart(window: InsightWindow = "24h", now = Date.now()): number {
  return now - windowToMs(window);
}

export function buildViewPulseCounts(events: EventRecord[]) {
  return {
    totalEvents: events.length,
    agentActions: events.filter((e) => e.category === "agent_action").length,
    codeChanges: events.filter((e) => e.category === "code_change").length,
    productEvents: events.filter((e) => e.category === "product_event").length,
    decisions: events.filter((e) => e.category === "company_decision").length,
    revenueEvents: events.filter((e) => e.category === "revenue_event").length,
    systemEvents: events.filter((e) => e.category === "system_event").length,
  };
}
