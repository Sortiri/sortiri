import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { docToEvent, type EventRecord } from "./eventsLib";
import type { EventLinkType } from "./linkRules";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type EventLinkRecord = {
  id: string;
  workspaceId: string;
  fromEventId?: string;
  toEventId?: string;
  fromWorkstreamId?: string;
  toWorkstreamId?: string;
  type: EventLinkType;
  confidence: number;
  reason: string;
  createdBy: "system" | "agent" | "human";
  metadata?: unknown;
  createdAt: number;
};

export type RelatedHistoryItem = {
  link: EventLinkRecord;
  direction: "before" | "after";
  relatedEvent?: {
    id: string;
    title: string;
    type: string;
    category: EventRecord["category"];
    source: EventRecord["source"];
    occurredAt: number;
    workstreamId?: string;
  };
};

export type InsertEventLinkInput = {
  workspaceId: Id<"workspaces">;
  fromEventId?: Id<"events">;
  toEventId?: Id<"events">;
  fromWorkstreamId?: Id<"workstreams">;
  toWorkstreamId?: Id<"workstreams">;
  type: EventLinkType;
  confidence: number;
  reason: string;
  createdBy?: "system" | "agent" | "human";
  metadata?: unknown;
};

export function docToEventLink(doc: Doc<"eventLinks">): EventLinkRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    fromEventId: doc.fromEventId,
    toEventId: doc.toEventId,
    fromWorkstreamId: doc.fromWorkstreamId,
    toWorkstreamId: doc.toWorkstreamId,
    type: doc.type,
    confidence: doc.confidence,
    reason: doc.reason,
    createdBy: doc.createdBy,
    metadata: doc.metadata,
    createdAt: doc.createdAt,
  };
}

export async function findDuplicateLink(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  fromEventId: Id<"events">,
  toEventId: Id<"events">,
  type: EventLinkType,
): Promise<Doc<"eventLinks"> | null> {
  const existing = await ctx.db
    .query("eventLinks")
    .withIndex("by_workspace_from_to_type", (q) =>
      q
        .eq("workspaceId", workspaceId)
        .eq("fromEventId", fromEventId)
        .eq("toEventId", toEventId)
        .eq("type", type),
    )
    .first();
  return existing ?? null;
}

export async function insertEventLinkDoc(
  ctx: DbWriteCtx,
  input: InsertEventLinkInput,
): Promise<Id<"eventLinks">> {
  return ctx.db.insert("eventLinks", {
    workspaceId: input.workspaceId,
    fromEventId: input.fromEventId,
    toEventId: input.toEventId,
    fromWorkstreamId: input.fromWorkstreamId,
    toWorkstreamId: input.toWorkstreamId,
    type: input.type,
    confidence: input.confidence,
    reason: input.reason,
    createdBy: input.createdBy ?? "system",
    metadata: input.metadata,
    createdAt: Date.now(),
  });
}

function toRelatedEvent(event: EventRecord): RelatedHistoryItem["relatedEvent"] {
  return {
    id: event.id,
    title: event.title,
    type: event.type,
    category: event.category,
    source: event.source,
    occurredAt: event.occurredAt,
    workstreamId: event.workstreamId,
  };
}

export function getLinkDirection(
  anchorEventId: string,
  anchorOccurredAt: number,
  link: EventLinkRecord,
  relatedOccurredAt: number,
): "before" | "after" {
  if (relatedOccurredAt < anchorOccurredAt) return "before";
  if (relatedOccurredAt > anchorOccurredAt) return "after";
  return link.fromEventId === anchorEventId ? "after" : "before";
}

export async function hydrateLinkForEvent(
  ctx: DbReadCtx,
  anchorEventId: Id<"events">,
  linkDoc: Doc<"eventLinks">,
): Promise<RelatedHistoryItem | null> {
  const link = docToEventLink(linkDoc);
  const anchor = await ctx.db.get(anchorEventId);
  if (!anchor) return null;

  let relatedEventId: Id<"events"> | null = null;
  if (link.fromEventId === anchorEventId && link.toEventId) {
    relatedEventId = link.toEventId as Id<"events">;
  } else if (link.toEventId === anchorEventId && link.fromEventId) {
    relatedEventId = link.fromEventId as Id<"events">;
  }

  if (!relatedEventId) return null;

  const relatedDoc = await ctx.db.get(relatedEventId);
  if (!relatedDoc) return null;

  const relatedEvent = docToEvent(relatedDoc);
  return {
    link,
    direction: getLinkDirection(
      anchorEventId,
      anchor.occurredAt,
      link,
      relatedEvent.occurredAt,
    ),
    relatedEvent: toRelatedEvent(relatedEvent),
  };
}

export async function listLinksForEvent(
  ctx: DbReadCtx,
  eventId: Id<"events">,
  limit = 20,
): Promise<RelatedHistoryItem[]> {
  const fromLinks = await ctx.db
    .query("eventLinks")
    .withIndex("by_from_event", (q) => q.eq("fromEventId", eventId))
    .take(limit);

  const toLinks = await ctx.db
    .query("eventLinks")
    .withIndex("by_to_event", (q) => q.eq("toEventId", eventId))
    .take(limit);

  const seen = new Set<string>();
  const items: RelatedHistoryItem[] = [];

  for (const linkDoc of [...fromLinks, ...toLinks]) {
    if (seen.has(linkDoc._id)) continue;
    seen.add(linkDoc._id);
    const hydrated = await hydrateLinkForEvent(ctx, eventId, linkDoc);
    if (hydrated) items.push(hydrated);
  }

  const before = items
    .filter((item) => item.direction === "before")
    .sort((a, b) => (b.relatedEvent?.occurredAt ?? 0) - (a.relatedEvent?.occurredAt ?? 0));
  const after = items
    .filter((item) => item.direction === "after")
    .sort((a, b) => (a.relatedEvent?.occurredAt ?? 0) - (b.relatedEvent?.occurredAt ?? 0));

  return [...before, ...after].slice(0, limit);
}

export async function countLinksForEventIds(
  ctx: DbReadCtx,
  eventIds: Id<"events">[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const eventId of eventIds) {
    counts[eventId] = 0;
  }

  for (const eventId of eventIds) {
    const fromLinks = await ctx.db
      .query("eventLinks")
      .withIndex("by_from_event", (q) => q.eq("fromEventId", eventId))
      .collect();
    const toLinks = await ctx.db
      .query("eventLinks")
      .withIndex("by_to_event", (q) => q.eq("toEventId", eventId))
      .collect();

    const unique = new Set<string>();
    for (const link of [...fromLinks, ...toLinks]) {
      unique.add(link._id);
    }
    counts[eventId] = unique.size;
  }

  return counts;
}

export type LinkWithEvents = {
  link: EventLinkRecord;
  fromEvent?: EventRecord;
  toEvent?: EventRecord;
};

export async function listLinksForEventIds(
  ctx: DbReadCtx,
  eventIds: Id<"events">[],
  limitPerEvent = 3,
): Promise<LinkWithEvents[]> {
  const results: LinkWithEvents[] = [];
  const seen = new Set<string>();

  for (const eventId of eventIds.slice(0, 10)) {
    const fromLinks = await ctx.db
      .query("eventLinks")
      .withIndex("by_from_event", (q) => q.eq("fromEventId", eventId))
      .take(limitPerEvent);
    const toLinks = await ctx.db
      .query("eventLinks")
      .withIndex("by_to_event", (q) => q.eq("toEventId", eventId))
      .take(limitPerEvent);

    for (const linkDoc of [...fromLinks, ...toLinks]) {
      if (seen.has(linkDoc._id)) continue;
      seen.add(linkDoc._id);

      const link = docToEventLink(linkDoc);
      let fromEvent: EventRecord | undefined;
      let toEvent: EventRecord | undefined;

      if (link.fromEventId) {
        const doc = await ctx.db.get(link.fromEventId as Id<"events">);
        if (doc) fromEvent = docToEvent(doc);
      }
      if (link.toEventId) {
        const doc = await ctx.db.get(link.toEventId as Id<"events">);
        if (doc) toEvent = docToEvent(doc);
      }

      results.push({ link, fromEvent, toEvent });
      if (results.length >= 15) return results;
    }
  }

  return results;
}

export type WorkstreamRelatedGroup = {
  label: string;
  items: RelatedHistoryItem[];
};

export async function listRelatedForWorkstream(
  ctx: DbReadCtx,
  workstreamId: Id<"workstreams">,
  workstreamEventIds: Set<string>,
  limit = 30,
): Promise<WorkstreamRelatedGroup[]> {
  const items: RelatedHistoryItem[] = [];
  const seen = new Set<string>();

  for (const eventId of workstreamEventIds) {
    const fromLinks = await ctx.db
      .query("eventLinks")
      .withIndex("by_from_event", (q) => q.eq("fromEventId", eventId as Id<"events">))
      .take(20);
    const toLinks = await ctx.db
      .query("eventLinks")
      .withIndex("by_to_event", (q) => q.eq("toEventId", eventId as Id<"events">))
      .take(20);

    for (const linkDoc of [...fromLinks, ...toLinks]) {
      if (seen.has(linkDoc._id)) continue;
      seen.add(linkDoc._id);

      const hydrated = await hydrateLinkForEvent(
        ctx,
        eventId as Id<"events">,
        linkDoc,
      );
      if (!hydrated?.relatedEvent) continue;

      const isInReplay = workstreamEventIds.has(hydrated.relatedEvent.id);
      if (isInReplay && hydrated.link.confidence < 0.85) continue;

      items.push(hydrated);
    }
  }

  const possibleImpact: RelatedHistoryItem[] = [];
  const relatedDecisions: RelatedHistoryItem[] = [];
  const externalCode: RelatedHistoryItem[] = [];
  const other: RelatedHistoryItem[] = [];

  for (const item of items.slice(0, limit)) {
    const related = item.relatedEvent;
    if (!related) continue;

    if (item.link.type === "led_to" && item.link.confidence < 0.6) {
      possibleImpact.push(item);
    } else if (related.category === "company_decision") {
      relatedDecisions.push(item);
    } else if (related.category === "code_change" && !workstreamEventIds.has(related.id)) {
      externalCode.push(item);
    } else if (!workstreamEventIds.has(related.id)) {
      other.push(item);
    }
  }

  const groups: WorkstreamRelatedGroup[] = [];
  if (possibleImpact.length > 0) {
    groups.push({ label: "Possible impact", items: possibleImpact });
  }
  if (relatedDecisions.length > 0) {
    groups.push({ label: "Related decisions", items: relatedDecisions });
  }
  if (externalCode.length > 0) {
    groups.push({ label: "External code changes", items: externalCode });
  }
  if (other.length > 0) {
    groups.push({ label: "Related history", items: other });
  }

  return groups;
}

export function getConfidenceLabel(confidence: number): "Strong" | "Likely" | "Possible" {
  if (confidence >= 0.85) return "Strong";
  if (confidence >= 0.6) return "Likely";
  return "Possible";
}

export async function getRelatedEventsForEvidence(
  ctx: DbReadCtx,
  evidenceEventIds: Id<"events">[],
  excludeIds: Set<string>,
  limit = 5,
): Promise<RelatedHistoryItem["relatedEvent"][]> {
  const related: RelatedHistoryItem["relatedEvent"][] = [];
  const seen = new Set<string>(excludeIds);

  for (const eventId of evidenceEventIds) {
    const links = await listLinksForEvent(ctx, eventId, 3);
    for (const item of links) {
      if (!item.relatedEvent || seen.has(item.relatedEvent.id)) continue;
      seen.add(item.relatedEvent.id);
      related.push(item.relatedEvent);
      if (related.length >= limit) return related;
    }
  }

  return related;
}
