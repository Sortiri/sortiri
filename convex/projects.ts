import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  canWriteWorkspaceData,
  getAccessibleProjectIds,
  getWorkspaceMembership,
  requireProjectAccess,
  requireWorkspaceRole,
} from "./lib/authz";
import { assertWorkspaceBrowseAccess } from "./lib/eventsLib";
import { upsertProjectAccess } from "./lib/projectAccessLib";
import {
  assertProjectInWorkspace,
  backfillProjectScopeForWorkspace,
  createProjectDoc,
  docToProjectRecord,
  enrichProjectRecord,
  ensureProjectForRepo,
  getProjectEventStats,
} from "./lib/projectsLib";
import {
  buildProjectPulse,
  getActiveProjectsForWorkspace,
  type ActiveProjectSummary,
  type ProjectPulseResult,
} from "./lib/projectPulse";
import type { ProjectRecord } from "./lib/projectsLib";
import type { Id } from "./_generated/dataModel";

const projectStatusFilterValidator = v.optional(
  v.union(v.literal("active"), v.literal("archived"), v.literal("all")),
);

const projectWindowValidator = v.optional(
  v.union(v.literal("24h"), v.literal("7d"), v.literal("30d")),
);

export const create = mutation({
  args: {
    workspaceId: v.string(),
    name: v.string(),
    repositoryUrl: v.optional(v.string()),
    localPath: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ProjectRecord> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);
    const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
    if (!membership || !canWriteWorkspaceData(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    const projectId = await createProjectDoc(ctx, {
      workspaceId: workspace._id,
      name: args.name,
      repositoryUrl: args.repositoryUrl,
      localPath: args.localPath,
      slug: args.slug,
      description: args.description,
    });

    if (membership.role === "member") {
      await upsertProjectAccess(ctx, {
        workspaceId: workspace._id,
        projectId,
        memberId: membership._id,
        accessLevel: "owner",
      });
    }

    const doc = await ctx.db.get(projectId);
    if (!doc) {
      throw new Error("Failed to create project");
    }
    return docToProjectRecord(doc, workspace.externalId);
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.string(),
    status: projectStatusFilterValidator,
  },
  handler: async (ctx, args): Promise<ProjectRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);
    const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
    if (!membership) {
      return [];
    }
    const accessible = await getAccessibleProjectIds(ctx, workspace._id, membership);
    const statusFilter = args.status ?? "active";

    let docs = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    if (accessible !== "all") {
      docs = docs.filter((doc) => accessible.has(doc._id));
    }

    if (statusFilter !== "all") {
      docs = docs.filter((doc) => (doc.status ?? "active") === statusFilter);
    }

    const withStats = await Promise.all(
      docs.map(async (doc) => {
        const stats = await getProjectEventStats(ctx, workspace._id, doc._id);
        return { doc, stats };
      }),
    );

    withStats.sort((a, b) => {
      const aLast = a.stats.lastEventAt ?? 0;
      const bLast = b.stats.lastEventAt ?? 0;
      if (bLast !== aLast) return bLast - aLast;
      return b.doc.createdAt - a.doc.createdAt;
    });

    return withStats.map(({ doc, stats }) => ({
      ...docToProjectRecord(doc, workspace.externalId),
      eventCount: stats.eventCount,
      lastEventAt: stats.lastEventAt,
    }));
  },
});

export const getById = query({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<ProjectRecord | null> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);

    try {
      await requireProjectAccess(ctx, workspace._id, args.projectId, userId);
      const doc = await assertProjectInWorkspace(ctx, args.projectId, workspace._id);
      return enrichProjectRecord(ctx, doc, workspace.externalId, workspace._id);
    } catch {
      return null;
    }
  },
});

export const update = mutation({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    repositoryUrl: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ProjectRecord> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);
    await requireProjectAccess(ctx, workspace._id, args.projectId, userId, {
      minWrite: true,
    });
    await assertProjectInWorkspace(ctx, args.projectId, workspace._id);

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.description !== undefined) patch.description = args.description;
    if (args.repositoryUrl !== undefined) patch.repositoryUrl = args.repositoryUrl;
    if (args.slug !== undefined) patch.slug = args.slug;

    await ctx.db.patch(args.projectId, patch);

    const doc = await ctx.db.get(args.projectId);
    if (!doc) throw new Error("Project not found");
    return docToProjectRecord(doc, workspace.externalId);
  },
});

export const archive = mutation({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<ProjectRecord> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);
    await requireProjectAccess(ctx, workspace._id, args.projectId, userId, {
      minWrite: true,
    });
    await assertProjectInWorkspace(ctx, args.projectId, workspace._id);

    await ctx.db.patch(args.projectId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    const doc = await ctx.db.get(args.projectId);
    if (!doc) throw new Error("Project not found");
    return docToProjectRecord(doc, workspace.externalId);
  },
});

export const getProjectPulse = query({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
    window: projectWindowValidator,
  },
  handler: async (ctx, args): Promise<ProjectPulseResult> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);
    await requireProjectAccess(ctx, workspace._id, args.projectId, userId);
    await assertProjectInWorkspace(ctx, args.projectId, workspace._id);

    return buildProjectPulse(
      ctx,
      workspace._id,
      args.projectId,
      args.window ?? "7d",
    );
  },
});

export const getActiveProjects = query({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ActiveProjectSummary[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);
    const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
    if (!membership) {
      return [];
    }
    const accessible = await getAccessibleProjectIds(ctx, workspace._id, membership);
    const summaries = await getActiveProjectsForWorkspace(ctx, workspace._id, args.limit ?? 3);
    if (accessible === "all") {
      return summaries;
    }
    return summaries.filter((summary) =>
      accessible.has(summary.projectId as Id<"projects">),
    );
  },
});

export const backfillProjectScope = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);
    return backfillProjectScopeForWorkspace(ctx, workspace._id);
  },
});

export const ensureForRepo = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    repositoryUrl: v.optional(v.string()),
    localPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ensureProjectForRepo(ctx, args);
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    return docToProjectRecord(project, workspace.externalId);
  },
});

export const getCliSetupStatus = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);

    const doctorEvent = await ctx.db
      .query("events")
      .withIndex("by_type", (q) =>
        q.eq("workspaceId", workspace._id).eq("type", "cli.doctor_passed"),
      )
      .order("desc")
      .first();

    let projectName: string | null = null;
    if (doctorEvent?.projectId) {
      const project = await ctx.db.get(doctorEvent.projectId);
      projectName = project?.name ?? null;
    }

    return {
      connected: Boolean(doctorEvent),
      projectName,
      lastCliEventAt: doctorEvent?.occurredAt ?? null,
    };
  },
});

export const resolveMany = query({
  args: {
    workspaceId: v.string(),
    projectIds: v.array(v.id("projects")),
  },
  handler: async (ctx, args): Promise<ProjectRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);

    const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
    const accessible =
      membership ? await getAccessibleProjectIds(ctx, workspace._id, membership) : new Set();

    const results: ProjectRecord[] = [];
    for (const projectId of args.projectIds) {
      const doc = await ctx.db.get(projectId);
      if (doc && doc.workspaceId === workspace._id) {
        if (accessible === "all" || accessible.has(doc._id)) {
          results.push(docToProjectRecord(doc, workspace.externalId));
        }
      }
    }
    return results;
  },
});

export const resolveForEntity = query({
  args: {
    workspaceId: v.string(),
    key: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);

    try {
      const byId = await ctx.db.get(args.key as Id<"projects">);
      if (byId && byId.workspaceId === workspace._id) {
        return byId._id;
      }
    } catch {
      // not a valid id
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    const normalizedName = args.name.trim().toLowerCase();
    const normalizedKey = args.key.trim().toLowerCase();

    const match = projects.find(
      (p) =>
        p.name.toLowerCase() === normalizedName ||
        p.name.toLowerCase() === normalizedKey ||
        (p.slug && p.slug.toLowerCase() === normalizedKey),
    );

    return match?._id ?? null;
  },
});

export const getProjectsForSource = query({
  args: {
    workspaceId: v.string(),
    source: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);
    const limit = args.limit ?? 5;

    const eventDocs = await ctx.db
      .query("events")
      .withIndex("by_source", (q) =>
        q.eq("workspaceId", workspace._id).eq("source", args.source as never),
      )
      .order("desc")
      .take(200);

    const projectIds = new Set<Id<"projects">>();
    for (const doc of eventDocs) {
      if (doc.projectId) projectIds.add(doc.projectId);
      if (projectIds.size >= limit) break;
    }

    const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
    const accessible =
      membership ? await getAccessibleProjectIds(ctx, workspace._id, membership) : new Set();

    const projects: ProjectRecord[] = [];
    for (const projectId of projectIds) {
      if (accessible !== "all" && !accessible.has(projectId)) {
        continue;
      }
      const doc = await ctx.db.get(projectId);
      if (doc) {
        projects.push(docToProjectRecord(doc, workspace.externalId));
      }
    }
    return projects;
  },
});
