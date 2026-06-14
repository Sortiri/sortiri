import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  classifyEventForDisplay,
  resolveEventDisplayFields,
} from "./lib/eventDisplay";
import {
  actorValidator,
  entityValidator,
  eventCategoryValidator,
  eventSourceValidator,
  severityValidator,
} from "./lib/validators";
import {
  assertEventAccess,
  assertEventWriteAccess,
  assertWorkspaceAccess,
  docToEvent,
  insertEvent,
  listEventsByWorkstream,
  listEventsForWorkspace,
  searchEventsForWorkspace,
  type EventRecord,
} from "./lib/eventsLib";
import { assertProjectInWorkspace } from "./lib/projectsLib";
import { assertWorkstreamAccess } from "./lib/workstreamsLib";

const recordArgs = {
  workspaceId: v.string(),
  source: eventSourceValidator,
  category: eventCategoryValidator,
  type: v.string(),
  actor: actorValidator,
  title: v.string(),
  projectId: v.optional(v.id("projects")),
  workstreamId: v.optional(v.id("workstreams")),
  sourceId: v.optional(v.id("sources")),
  summary: v.optional(v.string()),
  entity: v.optional(entityValidator),
  artifactIds: v.optional(v.array(v.id("artifacts"))),
  data: v.optional(v.any()),
  severity: v.optional(severityValidator),
  tags: v.optional(v.array(v.string())),
  occurredAt: v.optional(v.number()),
};

export const record = mutation({
  args: recordArgs,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);

    return insertEvent(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      sourceId: args.sourceId,
      source: args.source,
      category: args.category,
      type: args.type,
      actor: args.actor,
      title: args.title,
      summary: args.summary,
      entity: args.entity,
      artifactIds: args.artifactIds,
      data: args.data,
      severity: args.severity,
      tags: args.tags,
      occurredAt: args.occurredAt,
    });
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
    category: v.optional(eventCategoryValidator),
    source: v.optional(eventSourceValidator),
    projectId: v.optional(v.id("projects")),
    visibility: v.optional(
      v.union(
        v.literal("primary"),
        v.literal("debug"),
        v.literal("hidden"),
        v.literal("all"),
      ),
    ),
  },
  handler: async (ctx, args): Promise<EventRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    return listEventsForWorkspace(ctx, workspace._id, {
      limit: args.limit,
      category: args.category,
      source: args.source,
      projectId: args.projectId,
      visibility: args.visibility ?? "primary",
      includeDebug: args.visibility === "all",
    });
  },
});

export const search = query({
  args: {
    workspaceId: v.string(),
    query: v.string(),
    category: v.optional(eventCategoryValidator),
    source: v.optional(eventSourceValidator),
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
    includeDebug: v.optional(v.boolean()),
    includeHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<EventRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    return searchEventsForWorkspace(ctx, workspace._id, {
      query: args.query,
      category: args.category,
      source: args.source,
      projectId: args.projectId,
      limit: args.limit,
      includeDebug: args.includeDebug ?? true,
      includeHidden: args.includeHidden ?? false,
    });
  },
});

export const listByProject = query({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
    category: v.optional(eventCategoryValidator),
    visibility: v.optional(
      v.union(
        v.literal("primary"),
        v.literal("debug"),
        v.literal("hidden"),
        v.literal("all"),
      ),
    ),
  },
  handler: async (ctx, args): Promise<EventRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    await assertProjectInWorkspace(ctx, args.projectId, workspace._id);

    return listEventsForWorkspace(ctx, workspace._id, {
      projectId: args.projectId,
      limit: args.limit ?? 50,
      category: args.category,
      visibility: args.visibility ?? "primary",
      includeDebug: args.visibility === "all",
    });
  },
});

export const listRecent = query({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<EventRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    return listEventsForWorkspace(ctx, workspace._id, {
      limit: args.limit ?? 20,
      visibility: "primary",
    });
  },
});

export const getById = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args): Promise<EventRecord> => {
    const userId = await requireUserId(ctx);
    const event = await assertEventAccess(ctx, args.eventId, userId);
    return docToEvent(event);
  },
});

export const listByWorkstream = query({
  args: {
    workstreamId: v.id("workstreams"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<EventRecord[]> => {
    const userId = await requireUserId(ctx);
    await assertWorkstreamAccess(ctx, args.workstreamId, userId);
    return listEventsByWorkstream(ctx, args.workstreamId, {
      limit: args.limit,
    });
  },
});

export type SourceStats = {
  eventCount: number;
  lastOccurredAt: number | null;
};

export const getSourceStats = query({
  args: {
    workspaceId: v.string(),
    source: eventSourceValidator,
  },
  handler: async (ctx, args): Promise<SourceStats> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);

    const docs = await ctx.db
      .query("events")
      .withIndex("by_source", (q) =>
        q.eq("workspaceId", workspace._id).eq("source", args.source),
      )
      .collect();

    if (docs.length === 0) {
      return { eventCount: 0, lastOccurredAt: null };
    }

    const lastOccurredAt = docs.reduce(
      (max, doc) => (doc.occurredAt > max ? doc.occurredAt : max),
      docs[0]!.occurredAt,
    );

    return {
      eventCount: docs.length,
      lastOccurredAt,
    };
  },
});

export const markImportant = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await assertEventWriteAccess(ctx, args.eventId, userId);
    await ctx.db.patch(event._id, {
      importance: "high",
      visibility: "primary",
      isUserPinned: true,
      isUserHidden: false,
      displayReason: "User marked as important",
    });
    return event._id;
  },
});

export const hide = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await assertEventWriteAccess(ctx, args.eventId, userId);
    await ctx.db.patch(event._id, {
      visibility: "hidden",
      isUserHidden: true,
      isUserPinned: false,
      displayReason: "User hid this event",
    });
    return event._id;
  },
});

export const restore = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const event = await assertEventWriteAccess(ctx, args.eventId, userId);
    const displayFields = classifyEventForDisplay({
      source: event.source,
      category: event.category,
      type: event.type,
      title: event.title,
      summary: event.summary,
      severity: event.severity,
      workstreamId: event.workstreamId,
      entity: event.entity,
      data: event.data,
    });
    await ctx.db.patch(event._id, {
      ...displayFields,
      isUserHidden: false,
      isUserPinned: false,
    });
    return event._id;
  },
});

export const backfillDisplayFields = mutation({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    const batchLimit = args.limit ?? 300;

    const docs = await ctx.db
      .query("events")
      .withIndex("by_workspace_occurred_at", (q) =>
        q.eq("workspaceId", workspace._id),
      )
      .order("desc")
      .take(batchLimit);

    let updated = 0;
    for (const doc of docs) {
      if (doc.isUserHidden || doc.isUserPinned) continue;
      if (doc.visibility && doc.importance && doc.displayReason) continue;

      const displayFields = resolveEventDisplayFields({
        source: doc.source,
        category: doc.category,
        type: doc.type,
        title: doc.title,
        summary: doc.summary,
        severity: doc.severity,
        workstreamId: doc.workstreamId,
        entity: doc.entity,
        data: doc.data,
        isUserPinned: doc.isUserPinned,
        isUserHidden: doc.isUserHidden,
      });

      await ctx.db.patch(doc._id, displayFields);
      updated += 1;
    }

    return { updated };
  },
});
