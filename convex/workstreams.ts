import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { getMembershipAndAccessible, requireProjectAccess } from "./lib/authz";
import { assertWorkspaceBrowseAccess } from "./lib/eventsLib";
import { validateIngestKey } from "./lib/ingestAuth";
import { createWorkstream, finishWorkstream } from "./lib/workstreamMutations";
import { workstreamStatusValidator, createdByValidator } from "./lib/validators";
import {
  assertWorkstreamAccess,
  docToWorkstream,
  listWorkstreamsForWorkspace,
  searchWorkstreamsForWorkspace,
  type WorkstreamRecord,
} from "./lib/workstreamsLib";
import { assertProjectInWorkspace } from "./lib/projectsLib";
import { getWorkspaceDocByExternalId } from "./lib/workspacesLib";

export const create = mutation({
  args: {
    ingestKey: v.string(),
    workspaceId: v.string(),
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    summary: v.optional(v.string()),
    createdBy: v.optional(createdByValidator),
  },
  handler: async (ctx, args) => {
    validateIngestKey(args.ingestKey);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceId);

    const workstreamId = await createWorkstream(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      title: args.title,
      summary: args.summary,
      createdBy: args.createdBy,
    });

    return { workstreamId };
  },
});

export const finish = mutation({
  args: {
    ingestKey: v.string(),
    workspaceId: v.string(),
    workstreamId: v.id("workstreams"),
    summary: v.optional(v.string()),
    outcome: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateIngestKey(args.ingestKey);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceId);

    const workstreamId = await finishWorkstream(ctx, {
      workstreamId: args.workstreamId,
      workspaceId: workspace._id,
      summary: args.summary,
      outcome: args.outcome,
    });

    return { workstreamId };
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.string(),
    status: v.optional(workstreamStatusValidator),
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<WorkstreamRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);
    const { accessible } = await getMembershipAndAccessible(ctx, workspace._id, userId);
    if (args.projectId) {
      await requireProjectAccess(ctx, workspace._id, args.projectId, userId);
    }
    return listWorkstreamsForWorkspace(ctx, workspace._id, {
      status: args.status,
      projectId: args.projectId,
      limit: args.limit,
      accessibleProjects: accessible,
    });
  },
});

export const listByProject = query({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
    status: v.optional(workstreamStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<WorkstreamRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);
    await requireProjectAccess(ctx, workspace._id, args.projectId, userId);
    await assertProjectInWorkspace(ctx, args.projectId, workspace._id);
    const { accessible } = await getMembershipAndAccessible(ctx, workspace._id, userId);

    return listWorkstreamsForWorkspace(ctx, workspace._id, {
      projectId: args.projectId,
      status: args.status,
      limit: args.limit,
    });
  },
});

export const getById = query({
  args: {
    workstreamId: v.id("workstreams"),
  },
  handler: async (ctx, args): Promise<WorkstreamRecord | null> => {
    const userId = await requireUserId(ctx);
    try {
      const workstream = await assertWorkstreamAccess(ctx, args.workstreamId, userId);
      return docToWorkstream(workstream);
    } catch {
      return null;
    }
  },
});

export const search = query({
  args: {
    workspaceId: v.string(),
    query: v.string(),
    status: v.optional(workstreamStatusValidator),
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<WorkstreamRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);
    const { accessible } = await getMembershipAndAccessible(ctx, workspace._id, userId);
    if (args.projectId) {
      await requireProjectAccess(ctx, workspace._id, args.projectId, userId);
    }
    return searchWorkstreamsForWorkspace(ctx, workspace._id, {
      query: args.query,
      status: args.status,
      projectId: args.projectId,
      limit: args.limit,
      accessibleProjects: accessible,
    });
  },
});

export const listRecent = query({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<WorkstreamRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);
    const { accessible } = await getMembershipAndAccessible(ctx, workspace._id, userId);
    const limit = args.limit ?? 10;

    const all = await listWorkstreamsForWorkspace(ctx, workspace._id, {
      limit: 100,
      accessibleProjects: accessible,
    });
    return all
      .filter((ws) => ws.status === "active" || ws.status === "completed")
      .slice(0, limit);
  },
});
