import type { MutationCtx, QueryCtx } from "../_generated/server";
import { buildTimelineName } from "./onboardingDoc";

export const DEFAULT_WORKSPACE_NAME = "My Timeline";

export type Workspace = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export function docToWorkspace(doc: {
  externalId: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}): Workspace {
  return {
    id: doc.externalId,
    userId: doc.userId,
    name: doc.name,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function listWorkspaceDocs(ctx: DbReadCtx, userId: string) {
  const docs = await ctx.db
    .query("workspaces")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  return docs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getActiveWorkspaceExternalId(ctx: DbReadCtx, userId: string) {
  const prefs = await ctx.db
    .query("userWorkspacePrefs")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  return prefs?.activeWorkspaceExternalId ?? null;
}

export async function setActiveId(
  ctx: DbWriteCtx,
  userId: string,
  workspaceExternalId: string,
) {
  const now = new Date().toISOString();
  const prefs = await ctx.db
    .query("userWorkspacePrefs")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (prefs) {
    await ctx.db.patch(prefs._id, {
      activeWorkspaceExternalId: workspaceExternalId,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("userWorkspacePrefs", {
      userId,
      activeWorkspaceExternalId: workspaceExternalId,
      updatedAt: now,
    });
  }
}

export async function ensureDefaultWorkspace(
  ctx: MutationCtx,
  userId: string,
): Promise<Workspace> {
  const existing = await listWorkspaceDocs(ctx, userId);
  if (existing.length > 0) {
    const activeId = await getActiveWorkspaceExternalId(ctx, userId);
    const active =
      existing.find((row) => row.externalId === activeId) ?? existing[0]!;
    if (!activeId || active.externalId !== activeId) {
      await setActiveId(ctx, userId, active.externalId);
    }
    return docToWorkspace(active);
  }

  const now = new Date().toISOString();
  const externalId = crypto.randomUUID();
  await ctx.db.insert("workspaces", {
    externalId,
    userId,
    name: DEFAULT_WORKSPACE_NAME,
    createdAt: now,
    updatedAt: now,
  });
  await setActiveId(ctx, userId, externalId);
  return {
    id: externalId,
    userId,
    name: DEFAULT_WORKSPACE_NAME,
    createdAt: now,
    updatedAt: now,
  };
}

export async function ensureOnboardingWorkspace(
  ctx: MutationCtx,
  userId: string,
  companyName: string,
): Promise<Workspace> {
  const timelineName = buildTimelineName(companyName);
  const now = new Date().toISOString();
  const existing = await listWorkspaceDocs(ctx, userId);

  if (existing.length === 0) {
    const externalId = crypto.randomUUID();
    await ctx.db.insert("workspaces", {
      externalId,
      userId,
      name: timelineName,
      createdAt: now,
      updatedAt: now,
    });
    await setActiveId(ctx, userId, externalId);
    return {
      id: externalId,
      userId,
      name: timelineName,
      createdAt: now,
      updatedAt: now,
    };
  }

  const activeId = await getActiveWorkspaceExternalId(ctx, userId);
  const active =
    existing.find((row) => row.externalId === activeId) ?? existing[0]!;

  await ctx.db.patch(active._id, {
    name: timelineName,
    updatedAt: now,
  });
  await setActiveId(ctx, userId, active.externalId);

  return {
    id: active.externalId,
    userId,
    name: timelineName,
    createdAt: active.createdAt,
    updatedAt: now,
  };
}
