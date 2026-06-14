import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUserId } from "./lib/auth";
import { assertWorkspaceAccess } from "./lib/eventsLib";
import { docToWorkstream } from "./lib/workstreamsLib";
import { entityTypeValidator } from "./lib/validators";
import {
  assertEntityAccess,
  backfillEntitiesForWorkspace,
  docToEntity,
  getEntityTimelineEvents,
  getRelatedWorkstreamsForEntity,
  listEntitiesForWorkspace,
  normalizeEntityKey,
  searchEntitiesForWorkspace,
  type EntityRecord,
} from "./lib/entitiesLib";
import { listEntitiesByProject } from "./lib/projectPulse";
import { assertProjectInWorkspace, docToProjectRecord } from "./lib/projectsLib";

export const listByWorkspace = query({
  args: {
    workspaceId: v.string(),
    type: v.optional(entityTypeValidator),
    limit: v.optional(v.number()),
    includeDebug: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<EntityRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    return listEntitiesForWorkspace(ctx, workspace._id, {
      type: args.type,
      limit: args.limit,
      includeDebug: args.includeDebug ?? false,
    });
  },
});

export const listRecent = query({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<EntityRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    return listEntitiesForWorkspace(ctx, workspace._id, {
      limit: args.limit ?? 5,
      includeDebug: false,
    });
  },
});

export const getById = query({
  args: { entityId: v.id("entities") },
  handler: async (ctx, args): Promise<EntityRecord> => {
    const userId = await requireUserId(ctx);
    const entity = await assertEntityAccess(ctx, args.entityId, userId);
    return docToEntity(entity);
  },
});

export const getByTypeAndKey = query({
  args: {
    workspaceId: v.string(),
    type: entityTypeValidator,
    key: v.string(),
  },
  handler: async (ctx, args): Promise<EntityRecord | null> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    const key = normalizeEntityKey(args.type, args.key);
    const doc = await ctx.db
      .query("entities")
      .withIndex("by_workspace_type_key", (q) =>
        q.eq("workspaceId", workspace._id).eq("type", args.type).eq("key", key),
      )
      .first();
    return doc ? docToEntity(doc) : null;
  },
});

export const resolveMany = query({
  args: {
    workspaceId: v.string(),
    candidates: v.array(
      v.object({
        type: entityTypeValidator,
        key: v.string(),
      }),
    ),
  },
  handler: async (ctx, args): Promise<Record<string, string | null>> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    const result: Record<string, string | null> = {};

    for (const candidate of args.candidates.slice(0, 50)) {
      const lookupKey = `${candidate.type}:${normalizeEntityKey(candidate.type, candidate.key)}`;
      const key = normalizeEntityKey(candidate.type, candidate.key);
      const doc = await ctx.db
        .query("entities")
        .withIndex("by_workspace_type_key", (q) =>
          q.eq("workspaceId", workspace._id).eq("type", candidate.type).eq("key", key),
        )
        .first();
      result[lookupKey] = doc ? doc._id : null;
    }

    return result;
  },
});

export const search = query({
  args: {
    workspaceId: v.string(),
    query: v.string(),
    type: v.optional(entityTypeValidator),
    limit: v.optional(v.number()),
    includeDebug: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<EntityRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    return searchEntitiesForWorkspace(ctx, workspace._id, {
      query: args.query,
      type: args.type,
      limit: args.limit,
      includeDebug: args.includeDebug ?? false,
    });
  },
});

export const getEntityTimeline = query({
  args: {
    entityId: v.id("entities"),
    visibility: v.optional(v.union(v.literal("primary"), v.literal("all"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const entity = await assertEntityAccess(ctx, args.entityId, userId);
    const events = await getEntityTimelineEvents(ctx, entity.workspaceId, entity, {
      visibility: args.visibility ?? "primary",
      limit: args.limit,
    });
    return {
      entity: docToEntity(entity),
      events,
    };
  },
});

export const getRelatedWorkstreams = query({
  args: {
    entityId: v.id("entities"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const entity = await assertEntityAccess(ctx, args.entityId, userId);
    const workstreamIds = await getRelatedWorkstreamsForEntity(
      ctx,
      entity.workspaceId,
      entity,
      args.limit ?? 10,
    );

    const workstreams = [];
    for (const workstreamId of workstreamIds) {
      const doc = await ctx.db.get(workstreamId);
      if (doc) workstreams.push(docToWorkstream(doc));
    }
    return workstreams;
  },
});

export const listByProject = query({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
    type: v.optional(entityTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<EntityRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    await assertProjectInWorkspace(ctx, args.projectId, workspace._id);

    return listEntitiesByProject(ctx, workspace._id, args.projectId, {
      type: args.type,
      limit: args.limit,
    });
  },
});

export const getProjectsForEntity = query({
  args: {
    entityId: v.id("entities"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const entity = await assertEntityAccess(ctx, args.entityId, userId);
    const limit = args.limit ?? 10;

    const events = await getEntityTimelineEvents(ctx, entity.workspaceId, entity, {
      limit: 200,
      visibility: "all",
    });

    const projectIds = new Set<Id<"projects">>();
    for (const event of events) {
      if (event.projectId) {
        projectIds.add(event.projectId as Id<"projects">);
        if (projectIds.size >= limit) break;
      }
    }

    const workspace = await ctx.db.get(entity.workspaceId);
    if (!workspace) return [];

    const projects = [];
    for (const projectId of projectIds) {
      const doc = await ctx.db.get(projectId);
      if (doc) {
        projects.push(docToProjectRecord(doc, workspace.externalId));
      }
    }
    return projects;
  },
});

export const backfillForWorkspace = mutation({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    return backfillEntitiesForWorkspace(ctx, workspace._id, args.limit ?? 500);
  },
});
