import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { WorkspaceRole } from "../../src/types/workspace-members";
import type {
  ProjectAccessCheck,
  ProjectAccessLevel,
  ProjectAccessRecord,
  ProjectAccessWithMember,
  ProjectAccessWithProject,
} from "../../src/types/project-access";
import {
  canManageProjectAccess,
  canWriteProjectData,
} from "../../src/types/project-access";
import type { EventRecord } from "./eventsLib";
import type { WorkstreamRecord } from "./workstreamsLib";
import { filterPrimaryEventRecords } from "./eventDisplay";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type AccessibleProjects = Set<Id<"projects">> | "all";

export function workspaceRoleSeesAllProjects(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function docToProjectAccess(doc: Doc<"projectAccess">): ProjectAccessRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    memberId: doc.memberId,
    accessLevel: doc.accessLevel,
    grantedBy: doc.grantedBy,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    revokedAt: doc.revokedAt,
  };
}

export function resolveProjectAccessLevel(
  workspaceRole: WorkspaceRole,
  accessRow: Doc<"projectAccess"> | null,
): ProjectAccessLevel | null {
  if (workspaceRoleSeesAllProjects(workspaceRole)) {
    return "owner";
  }
  if (!accessRow || accessRow.status !== "active") {
    return null;
  }
  return accessRow.accessLevel;
}

export function canViewProject(
  workspaceRole: WorkspaceRole,
  accessRow: Doc<"projectAccess"> | null,
): ProjectAccessCheck {
  if (workspaceRoleSeesAllProjects(workspaceRole)) {
    return { canAccess: true, accessLevel: "owner", reason: "workspace_admin" };
  }
  if (!accessRow || accessRow.status !== "active") {
    return { canAccess: false, reason: "not_assigned" };
  }
  return {
    canAccess: true,
    accessLevel: accessRow.accessLevel,
    reason: "project_assignment",
  };
}

export function canManageProjectAccessForUser(
  workspaceRole: WorkspaceRole,
  projectAccessLevel: ProjectAccessLevel | null,
): boolean {
  if (workspaceRoleSeesAllProjects(workspaceRole)) {
    return true;
  }
  if (!projectAccessLevel) {
    return false;
  }
  return canManageProjectAccess(projectAccessLevel);
}

export function projectAccessAllowsWrite(level: ProjectAccessLevel | null): boolean {
  if (!level) return false;
  return canWriteProjectData(level);
}

export function intersectProjectIds(
  requested: Id<"projects">[] | undefined,
  accessible: AccessibleProjects,
): Id<"projects">[] | undefined {
  if (!requested || requested.length === 0) {
    return requested;
  }
  if (accessible === "all") {
    return requested;
  }
  const filtered = requested.filter((id) => accessible.has(id));
  return filtered.length > 0 ? filtered : [];
}

export function isProjectAccessible(
  projectId: Id<"projects"> | undefined,
  accessible: AccessibleProjects,
): boolean {
  if (!projectId) {
    return true;
  }
  if (accessible === "all") {
    return true;
  }
  return accessible.has(projectId);
}

export function filterEventsByProjectAccess(
  events: EventRecord[],
  accessible: AccessibleProjects,
  options?: { workspaceLevelPrimaryOnly?: boolean },
): EventRecord[] {
  const workspaceLevelPrimaryOnly = options?.workspaceLevelPrimaryOnly ?? true;
  let filtered = events.filter((event) => {
    if (!event.projectId) {
      return true;
    }
    const projectId = event.projectId as Id<"projects">;
    return isProjectAccessible(projectId, accessible);
  });

  if (workspaceLevelPrimaryOnly && accessible !== "all") {
    filtered = filterPrimaryEventRecords(filtered);
  }

  return filtered;
}

export function filterWorkstreamsByProjectAccess(
  workstreams: WorkstreamRecord[],
  accessible: AccessibleProjects,
): WorkstreamRecord[] {
  return workstreams.filter((workstream) => {
    if (!workstream.projectId) {
      return true;
    }
    return isProjectAccessible(workstream.projectId as Id<"projects">, accessible);
  });
}

export function shouldHideEntity(
  eventProjectIds: Array<Id<"projects"> | undefined>,
  accessible: AccessibleProjects,
): boolean {
  const scoped = eventProjectIds.filter((id): id is Id<"projects"> => Boolean(id));
  if (scoped.length === 0) {
    return false;
  }
  if (accessible === "all") {
    return false;
  }
  return !scoped.some((projectId) => accessible.has(projectId));
}

export function filterInsightFindingEvidence<
  T extends {
    evidenceEventIds?: Id<"events">[];
    evidenceWorkstreamIds?: Id<"workstreams">[];
  },
>(
  finding: T,
  accessibleEventIds: Set<Id<"events">>,
  accessibleWorkstreamIds: Set<Id<"workstreams">>,
): T | null {
  const eventIds = (finding.evidenceEventIds ?? []).filter((id) =>
    accessibleEventIds.has(id),
  );
  const workstreamIds = (finding.evidenceWorkstreamIds ?? []).filter((id) =>
    accessibleWorkstreamIds.has(id),
  );

  if (eventIds.length === 0 && workstreamIds.length === 0) {
    return null;
  }

  return {
    ...finding,
    evidenceEventIds: eventIds.length > 0 ? eventIds : undefined,
    evidenceWorkstreamIds: workstreamIds.length > 0 ? workstreamIds : undefined,
  };
}

export async function listActiveAccessForMember(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  memberId: Id<"workspaceMembers">,
): Promise<Doc<"projectAccess">[]> {
  const rows = await ctx.db
    .query("projectAccess")
    .withIndex("by_workspace_member", (q) =>
      q.eq("workspaceId", workspaceId).eq("memberId", memberId),
    )
    .collect();
  return rows.filter((row) => row.status === "active");
}

export async function listActiveAccessForProject(
  ctx: DbReadCtx,
  projectId: Id<"projects">,
): Promise<Doc<"projectAccess">[]> {
  const rows = await ctx.db
    .query("projectAccess")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  return rows.filter((row) => row.status === "active");
}

export async function getActiveAccessForProjectMember(
  ctx: DbReadCtx,
  projectId: Id<"projects">,
  memberId: Id<"workspaceMembers">,
): Promise<Doc<"projectAccess"> | null> {
  const row = await ctx.db
    .query("projectAccess")
    .withIndex("by_project_member", (q) =>
      q.eq("projectId", projectId).eq("memberId", memberId),
    )
    .unique();
  if (!row || row.status !== "active") {
    return null;
  }
  return row;
}

export async function getAccessibleProjectIds(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  membership: Doc<"workspaceMembers">,
): Promise<AccessibleProjects> {
  if (workspaceRoleSeesAllProjects(membership.role)) {
    return "all";
  }

  const rows = await listActiveAccessForMember(ctx, workspaceId, membership._id);
  return new Set(rows.map((row) => row.projectId));
}

export async function upsertProjectAccess(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    projectId: Id<"projects">;
    memberId: Id<"workspaceMembers">;
    accessLevel: ProjectAccessLevel;
    grantedBy?: Doc<"projectAccess">["grantedBy"];
  },
): Promise<{ id: Id<"projectAccess">; created: boolean; levelChanged: boolean }> {
  const now = Date.now();
  const existing = await ctx.db
    .query("projectAccess")
    .withIndex("by_project_member", (q) =>
      q.eq("projectId", input.projectId).eq("memberId", input.memberId),
    )
    .unique();

  if (existing) {
    const levelChanged =
      existing.status === "active" && existing.accessLevel !== input.accessLevel;
    await ctx.db.patch(existing._id, {
      accessLevel: input.accessLevel,
      status: "active",
      grantedBy: input.grantedBy,
      updatedAt: now,
      revokedAt: undefined,
    });
    return { id: existing._id, created: false, levelChanged };
  }

  const id = await ctx.db.insert("projectAccess", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    memberId: input.memberId,
    accessLevel: input.accessLevel,
    grantedBy: input.grantedBy,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  return { id, created: true, levelChanged: false };
}

export async function revokeProjectAccess(
  ctx: DbWriteCtx,
  projectId: Id<"projects">,
  memberId: Id<"workspaceMembers">,
): Promise<boolean> {
  const existing = await ctx.db
    .query("projectAccess")
    .withIndex("by_project_member", (q) =>
      q.eq("projectId", projectId).eq("memberId", memberId),
    )
    .unique();
  if (!existing || existing.status === "revoked") {
    return false;
  }
  const now = Date.now();
  await ctx.db.patch(existing._id, {
    status: "revoked",
    updatedAt: now,
    revokedAt: now,
  });
  return true;
}

export async function enrichAccessWithMember(
  ctx: DbReadCtx,
  rows: Doc<"projectAccess">[],
): Promise<ProjectAccessWithMember[]> {
  const result: ProjectAccessWithMember[] = [];
  for (const row of rows) {
    const member = await ctx.db.get(row.memberId);
    result.push({
      ...docToProjectAccess(row),
      memberName: member?.name,
      memberEmail: member?.email,
      memberRole: member?.role,
    });
  }
  return result;
}

export async function enrichAccessWithProject(
  ctx: DbReadCtx,
  rows: Doc<"projectAccess">[],
  workspaceExternalId: string,
): Promise<ProjectAccessWithProject[]> {
  const result: ProjectAccessWithProject[] = [];
  for (const row of rows) {
    const project = await ctx.db.get(row.projectId);
    if (!project) continue;
    result.push({
      ...docToProjectAccess(row),
      projectName: project.name,
    });
  }
  return result;
}
