import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { getCurrentUser, requireWorkspaceMember, requireWorkspaceRole } from "./lib/authz";
import {
  DEFAULT_WORKSPACE_NAME,
  docToWorkspace,
  ensureDefaultWorkspace,
  getActiveWorkspaceExternalId,
  listWorkspaceDocs,
  resolveActiveWorkspaceId,
  setActiveId,
} from "./lib/workspacesLib";
import {
  ensureOwnerForWorkspace,
  listMembershipsForUser,
} from "./lib/workspaceMembersLib";
import type { WorkspaceRole } from "../src/types/workspace-members";

export type WorkspaceWithRole = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  role: WorkspaceRole;
};

export type WorkspaceState = {
  workspaces: WorkspaceWithRole[];
  activeWorkspaceId: string | null;
};

type DbReadCtx = Pick<QueryCtx, "db">;

async function buildState(ctx: DbReadCtx, userId: string): Promise<WorkspaceState> {
  const memberships = await listMembershipsForUser(ctx, userId);
  const workspaces: WorkspaceWithRole[] = [];

  for (const membership of memberships) {
    const doc = await ctx.db.get(membership.workspaceId);
    if (!doc) continue;
    workspaces.push({
      ...docToWorkspace(doc),
      role: membership.role,
    });
  }

  workspaces.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const storedId = await getActiveWorkspaceExternalId(ctx, userId);
  const activeWorkspaceId = resolveActiveWorkspaceId(storedId, workspaces);
  return { workspaces, activeWorkspaceId };
}

async function syncActiveWorkspacePrefs(
  ctx: Pick<MutationCtx, "db">,
  userId: string,
  state: WorkspaceState,
): Promise<void> {
  if (!state.activeWorkspaceId) {
    return;
  }
  const storedId = await getActiveWorkspaceExternalId(ctx, userId);
  if (storedId !== state.activeWorkspaceId) {
    await setActiveId(ctx, userId, state.activeWorkspaceId);
  }
}

export const getState = query({
  args: {},
  handler: async (ctx): Promise<WorkspaceState> => {
    const userId = await requireUserId(ctx);
    return buildState(ctx, userId);
  },
});

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const state = await buildState(ctx, userId);
    return state.workspaces.map((ws) => ({
      workspaceId: ws.id,
      name: ws.name,
      role: ws.role,
    }));
  },
});

export const bootstrap = mutation({
  args: {},
  handler: async (ctx): Promise<WorkspaceState> => {
    const user = await getCurrentUser(ctx);
    await ensureDefaultWorkspace(ctx, user.clerkUserId);

    const owned = await listWorkspaceDocs(ctx, user.clerkUserId);
    for (const ws of owned) {
      await ensureOwnerForWorkspace(ctx, ws._id, user);
    }

    const state = await buildState(ctx, user.clerkUserId);
    await syncActiveWorkspacePrefs(ctx, user.clerkUserId, state);
    return state;
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }): Promise<WorkspaceState> => {
    const user = await getCurrentUser(ctx);
    const now = new Date().toISOString();
    const externalId = crypto.randomUUID();
    const trimmed = name.trim() || DEFAULT_WORKSPACE_NAME;
    const workspaceId = await ctx.db.insert("workspaces", {
      externalId,
      userId: user.clerkUserId,
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    });
    await ensureOwnerForWorkspace(ctx, workspaceId, user);
    await setActiveId(ctx, user.clerkUserId, externalId);
    return buildState(ctx, user.clerkUserId);
  },
});

export const update = mutation({
  args: { workspaceId: v.string(), name: v.string() },
  handler: async (ctx, { workspaceId, name }): Promise<WorkspaceState> => {
    const user = await getCurrentUser(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, workspaceId, ["owner"]);
    const now = new Date().toISOString();
    await ctx.db.patch(workspace._id, {
      name: name.trim() || DEFAULT_WORKSPACE_NAME,
      updatedAt: now,
    });
    return buildState(ctx, user.clerkUserId);
  },
});

export const remove = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, { workspaceId }): Promise<WorkspaceState> => {
    const user = await getCurrentUser(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, workspaceId, ["owner"]);
    const memberships = await listMembershipsForUser(ctx, user.clerkUserId);
    if (memberships.length <= 1) {
      throw new Error("Cannot delete your only workspace");
    }
    const activeId = await getActiveWorkspaceExternalId(ctx, user.clerkUserId);
    await ctx.db.delete(workspace._id);
    if (activeId === workspaceId) {
      const remaining = memberships.filter((m) => m.workspaceId !== workspace._id);
      const next = remaining[0];
      if (next) {
        const nextWs = await ctx.db.get(next.workspaceId);
        if (nextWs) {
          await setActiveId(ctx, user.clerkUserId, nextWs.externalId);
        }
      }
    }
    return buildState(ctx, user.clerkUserId);
  },
});

export const setActive = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, { workspaceId }): Promise<WorkspaceState> => {
    const user = await getCurrentUser(ctx);
    await requireWorkspaceMember(ctx, workspaceId);
    await setActiveId(ctx, user.clerkUserId, workspaceId);
    return buildState(ctx, user.clerkUserId);
  },
});
