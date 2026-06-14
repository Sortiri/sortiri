import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { listEventsForWorkspace } from "./eventsLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type ProjectEventStats = {
  eventCount: number;
  lastEventAt?: number;
};

export async function getProjectEventStats(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
): Promise<ProjectEventStats> {
  const events = await listEventsForWorkspace(ctx, workspaceId, {
    projectId,
    limit: 10_000,
    scanLimit: 10_000,
    visibility: "primary",
  });

  if (events.length === 0) {
    return { eventCount: 0 };
  }

  return {
    eventCount: events.length,
    lastEventAt: events.reduce(
      (max, event) => (event.occurredAt > max ? event.occurredAt : max),
      events[0]!.occurredAt,
    ),
  };
}

export async function enrichProjectRecord(
  ctx: DbReadCtx,
  doc: Doc<"projects">,
  workspaceExternalId: string,
  workspaceId: Id<"workspaces">,
): Promise<ProjectRecord> {
  const stats = await getProjectEventStats(ctx, workspaceId, doc._id);
  const record = docToProjectRecord(doc, workspaceExternalId);
  return {
    ...record,
    eventCount: stats.eventCount,
    lastEventAt: stats.lastEventAt,
  };
}

export async function reconcileProjectActivity(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
): Promise<ProjectEventStats> {
  const stats = await getProjectEventStats(ctx, workspaceId, projectId);
  await ctx.db.patch(projectId, {
    eventCount: stats.eventCount,
    lastEventAt: stats.lastEventAt,
    updatedAt: Date.now(),
  });
  return stats;
}

export async function backfillProjectScopeForWorkspace(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
): Promise<{ eventsPatched: number; projectsReconciled: number }> {
  const events = await ctx.db
    .query("events")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  let eventsPatched = 0;
  for (const event of events) {
    if (event.projectId || !event.workstreamId) continue;
    const workstream = await ctx.db.get(event.workstreamId);
    if (!workstream?.projectId) continue;
    await ctx.db.patch(event._id, { projectId: workstream.projectId });
    eventsPatched += 1;
  }

  const projects = await ctx.db
    .query("projects")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  for (const project of projects) {
    await reconcileProjectActivity(ctx, workspaceId, project._id);
  }

  return { eventsPatched, projectsReconciled: projects.length };
}

export type ProjectStatus = "active" | "archived";

export type ProjectRecord = {
  id: string;
  workspaceId: string;
  name: string;
  slug?: string;
  description?: string;
  repositoryUrl?: string;
  localPath?: string;
  status: ProjectStatus;
  lastEventAt?: number;
  eventCount?: number;
  createdAt: number;
  updatedAt: number;
};

export function docToProjectRecord(
  doc: Doc<"projects">,
  workspaceExternalId: string,
): ProjectRecord {
  return {
    id: doc._id,
    workspaceId: workspaceExternalId,
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    repositoryUrl: doc.repositoryUrl,
    localPath: doc.localPath,
    status: doc.status ?? "active",
    lastEventAt: doc.lastEventAt,
    eventCount: doc.eventCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function sortProjectsByActivity(
  projects: Doc<"projects">[],
): Doc<"projects">[] {
  return [...projects].sort((a, b) => {
    const aLast = a.lastEventAt ?? 0;
    const bLast = b.lastEventAt ?? 0;
    if (bLast !== aLast) return bLast - aLast;
    return b.createdAt - a.createdAt;
  });
}

export async function bumpProjectActivity(
  ctx: DbWriteCtx,
  projectId: Id<"projects">,
  occurredAt: number,
): Promise<void> {
  const project = await ctx.db.get(projectId);
  if (!project) return;

  const lastEventAt = Math.max(project.lastEventAt ?? 0, occurredAt);
  await ctx.db.patch(projectId, {
    lastEventAt,
    eventCount: (project.eventCount ?? 0) + 1,
    updatedAt: Date.now(),
  });
}

export async function createProjectDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    name: string;
    repositoryUrl?: string;
    localPath?: string;
    slug?: string;
    description?: string;
  },
): Promise<Id<"projects">> {
  const now = Date.now();
  return ctx.db.insert("projects", {
    workspaceId: input.workspaceId,
    name: input.name.trim(),
    slug: input.slug,
    description: input.description,
    repositoryUrl: input.repositoryUrl,
    localPath: input.localPath,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

export async function findProjectByRepositoryUrl(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  repositoryUrl: string,
): Promise<Doc<"projects"> | null> {
  return ctx.db
    .query("projects")
    .withIndex("by_workspace_repositoryUrl", (q) =>
      q.eq("workspaceId", workspaceId).eq("repositoryUrl", repositoryUrl),
    )
    .unique();
}

export async function findProjectByName(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  name: string,
): Promise<Doc<"projects"> | null> {
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const normalized = name.trim().toLowerCase();
  return projects.find((p) => p.name.toLowerCase() === normalized) ?? null;
}

export async function ensureProjectForRepo(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    name: string;
    repositoryUrl?: string;
    localPath?: string;
  },
): Promise<Doc<"projects">> {
  if (input.repositoryUrl) {
    const existing = await findProjectByRepositoryUrl(
      ctx,
      input.workspaceId,
      input.repositoryUrl,
    );
    if (existing) return existing;
  }

  const byName = await findProjectByName(ctx, input.workspaceId, input.name);
  if (byName) return byName;

  const projectId = await createProjectDoc(ctx, input);
  const created = await ctx.db.get(projectId);
  if (!created) {
    throw new Error("Failed to create project");
  }
  return created;
}

export async function assertProjectInWorkspace(
  ctx: DbReadCtx,
  projectId: Id<"projects">,
  workspaceId: Id<"workspaces">,
): Promise<Doc<"projects">> {
  const project = await ctx.db.get(projectId);
  if (!project || project.workspaceId !== workspaceId) {
    throw new Error("Project not found");
  }
  return project;
}
