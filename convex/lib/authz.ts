import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  buildMembershipCapabilities,
  type WorkspaceMembershipCapabilities,
  type WorkspaceRole,
} from "../../src/types/workspace-members";
import type { ProjectAccessLevel } from "../../src/types/project-access";
import { getWorkspaceDocByExternalId } from "./workspacesLib";
import {
  type AccessibleProjects,
  canViewProject,
  getAccessibleProjectIds,
  getActiveAccessForProjectMember,
  intersectProjectIds,
  isProjectAccessible,
  projectAccessAllowsWrite as projectLevelAllowsWrite,
  workspaceRoleSeesAllProjects,
} from "./projectAccessLib";
import { canSeeView } from "./savedViewsLib";
import type { SavedViewFilters } from "./viewFilters";

export type { AccessibleProjects };
export { getAccessibleProjectIds, intersectProjectIds, isProjectAccessible };

type AuthCtx = Pick<QueryCtx, "auth" | "db"> | Pick<MutationCtx, "auth" | "db">;
type DbReadCtx = Pick<QueryCtx, "db">;

export type CurrentUser = {
  clerkUserId: string;
  email?: string;
  name?: string;
  imageUrl?: string;
};

export async function getCurrentUser(ctx: AuthCtx): Promise<CurrentUser> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return {
    clerkUserId: identity.subject,
    email: identity.email ?? undefined,
    name: identity.name ?? undefined,
    imageUrl: identity.pictureUrl ?? undefined,
  };
}

export async function getWorkspaceMembership(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  clerkUserId: string,
): Promise<Doc<"workspaceMembers"> | null> {
  const member = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspaceDocId).eq("clerkUserId", clerkUserId),
    )
    .unique();
  if (!member || member.status !== "active") {
    return null;
  }
  return member;
}

export async function requireWorkspaceMember(
  ctx: AuthCtx,
  workspaceExternalId: string,
): Promise<{
  user: CurrentUser;
  workspace: Doc<"workspaces">;
  membership: Doc<"workspaceMembers">;
}> {
  const user = await getCurrentUser(ctx);
  const workspace = await getWorkspaceDocByExternalId(ctx, workspaceExternalId);
  const membership = await getWorkspaceMembership(ctx, workspace._id, user.clerkUserId);
  if (!membership) {
    throw new Error("Workspace not found");
  }
  return { user, workspace, membership };
}

export async function requireWorkspaceRole(
  ctx: AuthCtx,
  workspaceExternalId: string,
  allowedRoles: WorkspaceRole[],
): Promise<{
  user: CurrentUser;
  workspace: Doc<"workspaces">;
  membership: Doc<"workspaceMembers">;
}> {
  const result = await requireWorkspaceMember(ctx, workspaceExternalId);
  if (!allowedRoles.includes(result.membership.role)) {
    throw new Error("Insufficient permissions");
  }
  return result;
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageSources(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function canCreateApiKeys(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageWorkspace(role: WorkspaceRole): boolean {
  return role === "owner";
}

export function canWriteWorkspaceData(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

export function isAuditorRole(role: WorkspaceRole): boolean {
  return role === "auditor";
}

export function canManageAuditReports(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function canAccessWorkspaceSurface(role: WorkspaceRole): boolean {
  return role !== "auditor";
}

export function assertNotAuditorWorkspaceBrowse(
  membership: Doc<"workspaceMembers">,
): void {
  if (isAuditorRole(membership.role)) {
    throw new Error("Access denied");
  }
}

export function membershipToCapabilities(
  membership: Doc<"workspaceMembers">,
): WorkspaceMembershipCapabilities {
  return buildMembershipCapabilities(membership.role, membership.status);
}

export async function requireMembershipForWorkspaceDoc(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  clerkUserId: string,
): Promise<Doc<"workspaces">> {
  const workspace = await ctx.db.get(workspaceDocId);
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  const membership = await getWorkspaceMembership(ctx, workspaceDocId, clerkUserId);
  if (!membership) {
    throw new Error("Workspace not found");
  }
  return workspace;
}

export async function getMembershipAndAccessible(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  clerkUserId: string,
): Promise<{
  membership: Doc<"workspaceMembers">;
  accessible: AccessibleProjects;
}> {
  const membership = await getWorkspaceMembership(ctx, workspaceDocId, clerkUserId);
  if (!membership) {
    throw new Error("Workspace not found");
  }
  const accessible = await getAccessibleProjectIds(ctx, workspaceDocId, membership);
  return { membership, accessible };
}

export function canManageProjectAssignments(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export async function requireProjectAccess(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
  clerkUserId: string,
  options?: { minWrite?: boolean },
): Promise<{
  membership: Doc<"workspaceMembers">;
  accessLevel: ProjectAccessLevel;
}> {
  const membership = await getWorkspaceMembership(ctx, workspaceId, clerkUserId);
  if (!membership) {
    throw new Error("Project not found");
  }

  const accessRow = workspaceRoleSeesAllProjects(membership.role)
    ? null
    : await getActiveAccessForProjectMember(ctx, projectId, membership._id);

  const check = canViewProject(membership.role, accessRow);
  if (!check.canAccess || !check.accessLevel) {
    throw new Error("Project not found");
  }

  if (options?.minWrite && !projectLevelAllowsWrite(check.accessLevel)) {
    throw new Error("Insufficient permissions");
  }

  return { membership, accessLevel: check.accessLevel };
}

export function canViewEvent(
  event: { projectId?: Id<"projects"> | string; visibility?: string; isUserHidden?: boolean },
  accessible: AccessibleProjects,
): boolean {
  if (event.isUserHidden) {
    return false;
  }
  if (!event.projectId) {
    if (accessible === "all") {
      return true;
    }
    return event.visibility !== "debug" && event.visibility !== "hidden";
  }
  return isProjectAccessible(event.projectId as Id<"projects">, accessible);
}

export function canViewWorkstream(
  workstream: { projectId?: Id<"projects"> | string },
  accessible: AccessibleProjects,
): boolean {
  if (!workstream.projectId) {
    return true;
  }
  return isProjectAccessible(workstream.projectId as Id<"projects">, accessible);
}

export function canViewArtifact(
  artifact: { projectId?: Id<"projects">; workstreamId?: Id<"workstreams"> },
  accessible: AccessibleProjects,
  workstreamProjectId?: Id<"projects">,
): boolean {
  if (artifact.projectId) {
    return isProjectAccessible(artifact.projectId, accessible);
  }
  if (workstreamProjectId) {
    return isProjectAccessible(workstreamProjectId, accessible);
  }
  return true;
}

export function canViewSavedViewFilters(
  membership: Doc<"workspaceMembers">,
  view: Doc<"savedViews">,
  accessible: AccessibleProjects,
): boolean {
  if (!canSeeView(membership, view)) {
    return false;
  }
  const projectIds = (view.filters as SavedViewFilters | undefined)?.projectIds;
  if (!projectIds || projectIds.length === 0) {
    return true;
  }
  const intersected = intersectProjectIds(projectIds, accessible);
  return intersected === undefined || (intersected?.length ?? 0) > 0;
}

export function resolveActorDisplayName(
  actor: { name?: string; id?: string; email?: string },
  membersByEmail: Map<string, Doc<"workspaceMembers">>,
): string | undefined {
  if (actor.email) {
    const member = membersByEmail.get(actor.email.toLowerCase());
    if (member?.name) {
      return member.name;
    }
  }
  return actor.name;
}
