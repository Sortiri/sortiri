import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  DEFAULT_WORKSPACE_NAME,
  docToWorkspace,
  ensureDefaultWorkspace,
  getActiveWorkspaceExternalId,
  listWorkspaceDocs,
  setActiveId,
  type Workspace,
} from "./lib/workspacesLib";

export type WorkspaceState = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
};

type DbReadCtx = Pick<QueryCtx, "db">;

async function buildState(ctx: DbReadCtx, userId: string): Promise<WorkspaceState> {
  const docs = await listWorkspaceDocs(ctx, userId);
  const workspaces = docs.map(docToWorkspace);
  const activeId =
    (await getActiveWorkspaceExternalId(ctx, userId)) ?? workspaces[0]?.id ?? null;
  return { workspaces, activeWorkspaceId: activeId };
}

export const getState = query({
  args: {},
  handler: async (ctx): Promise<WorkspaceState> => {
    const userId = await requireUserId(ctx);
    return buildState(ctx, userId);
  },
});

export const bootstrap = mutation({
  args: {},
  handler: async (ctx): Promise<WorkspaceState> => {
    const userId = await requireUserId(ctx);
    await ensureDefaultWorkspace(ctx, userId);
    return buildState(ctx, userId);
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }): Promise<WorkspaceState> => {
    const userId = await requireUserId(ctx);
    const now = new Date().toISOString();
    const externalId = crypto.randomUUID();
    const trimmed = name.trim() || DEFAULT_WORKSPACE_NAME;
    await ctx.db.insert("workspaces", {
      externalId,
      userId,
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    });
    await setActiveId(ctx, userId, externalId);
    return buildState(ctx, userId);
  },
});

export const update = mutation({
  args: { workspaceId: v.string(), name: v.string() },
  handler: async (ctx, { workspaceId, name }): Promise<WorkspaceState> => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db
      .query("workspaces")
      .withIndex("by_externalId", (q) => q.eq("externalId", workspaceId))
      .unique();
    if (!doc || doc.userId !== userId) {
      throw new Error("Workspace not found");
    }
    const now = new Date().toISOString();
    await ctx.db.patch(doc._id, {
      name: name.trim() || DEFAULT_WORKSPACE_NAME,
      updatedAt: now,
    });
    return buildState(ctx, userId);
  },
});

export const remove = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, { workspaceId }): Promise<WorkspaceState> => {
    const userId = await requireUserId(ctx);
    const docs = await listWorkspaceDocs(ctx, userId);
    if (docs.length <= 1) {
      throw new Error("Cannot delete your only workspace");
    }
    const doc = docs.find((row) => row.externalId === workspaceId);
    if (!doc || doc.userId !== userId) {
      throw new Error("Workspace not found");
    }
    const activeId = await getActiveWorkspaceExternalId(ctx, userId);
    await ctx.db.delete(doc._id);
    if (activeId === workspaceId) {
      const remaining = docs.filter((row) => row.externalId !== workspaceId);
      await setActiveId(ctx, userId, remaining[0]!.externalId);
    }
    return buildState(ctx, userId);
  },
});

export const setActive = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, { workspaceId }): Promise<WorkspaceState> => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db
      .query("workspaces")
      .withIndex("by_externalId", (q) => q.eq("externalId", workspaceId))
      .unique();
    if (!doc || doc.userId !== userId) {
      throw new Error("Workspace not found");
    }
    await setActiveId(ctx, userId, workspaceId);
    return buildState(ctx, userId);
  },
});
