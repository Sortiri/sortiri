import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getCurrentUser,
  membershipToCapabilities,
  requireWorkspaceMember,
  requireWorkspaceRole,
} from "./lib/authz";
import { setActiveId } from "./lib/workspacesLib";
import {
  assertNotLastOwner,
  createInviteDoc,
  createMemberDoc,
  docToMemberRecord,
  findInviteByHash,
  hashInviteToken,
  listActiveMembersForWorkspace,
  recordWorkspaceTeamEvent,
} from "./lib/workspaceMembersLib";
import type { WorkspaceInviteRecord } from "../src/types/workspace-invites";
import type { WorkspaceMemberRecord, WorkspaceRole } from "../src/types/workspace-members";

function docToInviteRecord(
  doc: {
    _id: string;
    workspaceId: string;
    email: string;
    role: "admin" | "member" | "viewer" | "auditor";
    tokenPrefix: string;
    last4: string;
    status: "pending" | "accepted" | "expired" | "revoked";
    expiresAt: number;
    invitedBy?: WorkspaceInviteRecord["invitedBy"];
    acceptedByUserId?: string;
    acceptedAt?: number;
    createdAt: number;
    updatedAt: number;
  },
  workspaceExternalId: string,
): WorkspaceInviteRecord {
  return {
    id: doc._id,
    workspaceId: workspaceExternalId,
    email: doc.email,
    role: doc.role,
    tokenPrefix: doc.tokenPrefix,
    last4: doc.last4,
    status: doc.status,
    expiresAt: doc.expiresAt,
    invitedBy: doc.invitedBy,
    acceptedByUserId: doc.acceptedByUserId,
    acceptedAt: doc.acceptedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const getCurrentMembership = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const { membership } = await requireWorkspaceMember(ctx, args.workspaceId);
    return membershipToCapabilities(membership);
  },
});

export const listByWorkspace = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args): Promise<WorkspaceMemberRecord[]> => {
    const { workspace } = await requireWorkspaceMember(ctx, args.workspaceId);
    const members = await listActiveMembersForWorkspace(ctx, workspace._id);
    return members.map((doc) => docToMemberRecord(doc, workspace.externalId));
  },
});

export const listInvites = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args): Promise<WorkspaceInviteRecord[]> => {
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);
    const invites = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", workspace._id).eq("status", "pending"),
      )
      .collect();
    const now = Date.now();
    return invites
      .filter((row) => row.expiresAt > now)
      .map((doc) => docToInviteRecord(doc, workspace.externalId));
  },
});

export const getInviteByToken = query({
  args: { rawToken: v.string() },
  handler: async (ctx, args) => {
    const tokenHash = await hashInviteToken(args.rawToken);
    const invite = await findInviteByHash(ctx, tokenHash);
    if (!invite || invite.status !== "pending") {
      return null;
    }
    if (invite.expiresAt <= Date.now()) {
      return null;
    }
    const workspace = await ctx.db.get(invite.workspaceId);
    if (!workspace) {
      return null;
    }
    return {
      workspaceName: workspace.name,
      workspaceId: workspace.externalId,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    };
  },
});

export const invite = mutation({
  args: {
    workspaceId: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer"),
      v.literal("auditor"),
    ),
  },
  handler: async (ctx, args) => {
    const { user, workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new Error("Invalid email address");
    }

    const { inviteId, rawToken, expiresAt } = await createInviteDoc(ctx, {
      workspaceId: workspace._id,
      email,
      role: args.role,
      invitedBy: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });

    await recordWorkspaceTeamEvent(
      ctx,
      workspace._id,
      "workspace.member_invited",
      { name: user.name, email: user.email },
      `Invited ${email} as ${args.role}`,
    );

    return {
      inviteId,
      inviteUrl: `/invite/${rawToken}`,
      rawToken,
      expiresAt,
    };
  },
});

export const acceptInvite = mutation({
  args: { rawToken: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user.email) {
      throw new Error("Your account must have an email address to accept invites");
    }

    const tokenHash = await hashInviteToken(args.rawToken);
    const invite = await findInviteByHash(ctx, tokenHash);
    if (!invite || invite.status !== "pending") {
      throw new Error("Invite not found or no longer valid");
    }
    if (invite.expiresAt <= Date.now()) {
      const now = Date.now();
      await ctx.db.patch(invite._id, { status: "expired", updatedAt: now });
      throw new Error("Invite has expired");
    }

    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new Error(
        `This invite was sent to ${invite.email}. Sign in with that email to accept.`,
      );
    }

    const workspace = await ctx.db.get(invite.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspace._id).eq("clerkUserId", user.clerkUserId),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      if (existing.status === "active") {
        throw new Error("You are already a member of this workspace");
      }
      await ctx.db.patch(existing._id, {
        role: invite.role,
        status: "active",
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl,
        joinedAt: now,
        invitedBy: invite.invitedBy,
        updatedAt: now,
      });
    } else {
      await createMemberDoc(ctx, {
        workspaceId: workspace._id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl,
        role: invite.role,
        invitedBy: invite.invitedBy,
      });
    }

    await ctx.db.patch(invite._id, {
      status: "accepted",
      acceptedByUserId: user.clerkUserId,
      acceptedAt: now,
      updatedAt: now,
    });

    await recordWorkspaceTeamEvent(
      ctx,
      workspace._id,
      "workspace.member_joined",
      { name: user.name, email: user.email },
      `${user.name ?? user.email} joined as ${invite.role}`,
    );

    await setActiveId(ctx, user.clerkUserId, workspace.externalId);

    return {
      workspaceId: workspace.externalId,
      role: invite.role,
    };
  },
});

export const updateRole = mutation({
  args: {
    workspaceId: v.string(),
    memberId: v.id("workspaceMembers"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer"),
      v.literal("auditor"),
    ),
  },
  handler: async (ctx, args) => {
    const { user, workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
    ]);

    const member = await ctx.db.get(args.memberId);
    if (!member || member.workspaceId !== workspace._id || member.status !== "active") {
      throw new Error("Member not found");
    }

    if (member.role === args.role) {
      return { ok: true };
    }

    if (args.role === "owner" && member.role !== "owner") {
      // Only owners can promote; already enforced above
    }

    if (member.role === "owner" && args.role !== "owner") {
      await assertNotLastOwner(ctx, workspace._id, member._id);
    }

    const now = Date.now();
    await ctx.db.patch(member._id, {
      role: args.role,
      updatedAt: now,
    });

    await recordWorkspaceTeamEvent(
      ctx,
      workspace._id,
      "workspace.member_role_updated",
      { name: user.name, email: user.email },
      `Updated ${member.email ?? member.name ?? "member"} role to ${args.role}`,
    );

    return { ok: true };
  },
});

export const removeMember = mutation({
  args: {
    workspaceId: v.string(),
    memberId: v.id("workspaceMembers"),
  },
  handler: async (ctx, args) => {
    const { user, workspace, membership } = await requireWorkspaceRole(
      ctx,
      args.workspaceId,
      ["owner", "admin"],
    );

    const member = await ctx.db.get(args.memberId);
    if (!member || member.workspaceId !== workspace._id || member.status !== "active") {
      throw new Error("Member not found");
    }

    if (member.clerkUserId === user.clerkUserId) {
      throw new Error("You cannot remove yourself");
    }

    if (member.role === "owner" && membership.role !== "owner") {
      throw new Error("Only owners can remove other owners");
    }

    if (member.role === "owner") {
      await assertNotLastOwner(ctx, workspace._id, member._id);
    }

    const now = Date.now();
    await ctx.db.patch(member._id, {
      status: "removed",
      updatedAt: now,
    });

    await recordWorkspaceTeamEvent(
      ctx,
      workspace._id,
      "workspace.member_removed",
      { name: user.name, email: user.email },
      `Removed ${member.email ?? member.name ?? "member"}`,
    );

    return { ok: true };
  },
});

export const revokeInvite = mutation({
  args: {
    workspaceId: v.string(),
    inviteId: v.id("workspaceInvites"),
  },
  handler: async (ctx, args) => {
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.workspaceId !== workspace._id) {
      throw new Error("Invite not found");
    }

    if (invite.status !== "pending") {
      throw new Error("Invite is no longer pending");
    }

    const now = Date.now();
    await ctx.db.patch(invite._id, {
      status: "revoked",
      updatedAt: now,
    });

    return { ok: true };
  },
});
