import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  buildMembershipCapabilities,
  type WorkspaceMembershipCapabilities,
  type WorkspaceRole,
} from "../../src/types/workspace-members";
import { getWorkspaceDocByExternalId } from "./workspacesLib";

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
