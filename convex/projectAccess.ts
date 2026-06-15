import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  canManageProjectAssignments,
  getCurrentUser,
  requireWorkspaceMember,
  requireWorkspaceRole,
} from "./lib/authz";
import { insertEvent } from "./lib/eventsLib";
import { assertProjectInWorkspace } from "./lib/projectsLib";
import {
  docToProjectAccess,
  enrichAccessWithMember,
  enrichAccessWithProject,
  getActiveAccessForProjectMember,
  getAccessibleProjectIds,
  listActiveAccessForMember,
  listActiveAccessForProject,
  revokeProjectAccess,
  upsertProjectAccess,
  canViewProject,
} from "./lib/projectAccessLib";
import type { ProjectAccessLevel } from "../src/types/project-access";

const accessLevelValidator = v.union(
  v.literal("owner"),
  v.literal("manager"),
  v.literal("editor"),
  v.literal("viewer"),
);

async function recordProjectAccessEvent(
  ctx: Parameters<typeof insertEvent>[0],
  input: {
    workspaceId: Parameters<typeof insertEvent>[1]["workspaceId"];
    projectId: Parameters<typeof insertEvent>[1]["projectId"];
    type: "project.access_granted" | "project.access_revoked" | "project.access_level_changed";
    title: string;
    summary: string;
    actor: Parameters<typeof insertEvent>[1]["actor"];
  },
) {
  const project = input.projectId ? await ctx.db.get(input.projectId) : null;
  await insertEvent(ctx, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    source: "system",
    category: "system_event",
    type: input.type,
    actor: input.actor,
    title: input.title,
    summary: input.summary,
    entity: project
      ? { type: "project", name: project.name, id: input.projectId }
      : undefined,
    visibility: "primary",
    importance: "normal",
    occurredAt: Date.now(),
  });
}

export const grant = mutation({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
    memberId: v.id("workspaceMembers"),
    accessLevel: accessLevelValidator,
  },
  handler: async (ctx, args) => {
    const { user, workspace, membership } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);
    await assertProjectInWorkspace(ctx, args.projectId, workspace._id);

    const targetMember = await ctx.db.get(args.memberId);
    if (!targetMember || targetMember.workspaceId !== workspace._id) {
      throw new Error("Member not found");
    }
    if (targetMember.status !== "active") {
      throw new Error("Member is not active");
    }
    if (canManageProjectAssignments(targetMember.role)) {
      throw new Error("Workspace admins already have access to all projects");
    }

    const result = await upsertProjectAccess(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      memberId: args.memberId,
      accessLevel: args.accessLevel,
      grantedBy: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });

    const project = await ctx.db.get(args.projectId);
    const memberLabel = targetMember.name ?? targetMember.email ?? "Member";
    const projectName = project?.name ?? "project";

    await recordProjectAccessEvent(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      type: result.created
        ? "project.access_granted"
        : result.levelChanged
          ? "project.access_level_changed"
          : "project.access_granted",
      title: result.created ? "Granted project access" : "Updated project access",
      summary: `${memberLabel} was granted ${args.accessLevel} access to ${projectName}.`,
      actor: { type: "human", name: user.name ?? user.email ?? "User", email: user.email },
    });

    return docToProjectAccess((await ctx.db.get(result.id))!);
  },
});

export const revoke = mutation({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
    memberId: v.id("workspaceMembers"),
  },
  handler: async (ctx, args) => {
    const { user, workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);
    await assertProjectInWorkspace(ctx, args.projectId, workspace._id);

    const targetMember = await ctx.db.get(args.memberId);
    if (!targetMember || targetMember.workspaceId !== workspace._id) {
      throw new Error("Member not found");
    }

    const revoked = await revokeProjectAccess(ctx, args.projectId, args.memberId);
    if (!revoked) {
      return { ok: false };
    }

    const project = await ctx.db.get(args.projectId);
    const memberLabel = targetMember.name ?? targetMember.email ?? "Member";
    const projectName = project?.name ?? "project";

    await recordProjectAccessEvent(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      type: "project.access_revoked",
      title: "Revoked project access",
      summary: `${memberLabel} no longer has access to ${projectName}.`,
      actor: { type: "human", name: user.name ?? user.email ?? "User", email: user.email },
    });

    return { ok: true };
  },
});

export const listForProject = query({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const { workspace, membership } = await requireWorkspaceMember(ctx, args.workspaceId);
    await assertProjectInWorkspace(ctx, args.projectId, workspace._id);

    const accessRow = await getActiveAccessForProjectMember(
      ctx,
      args.projectId,
      membership._id,
    );
    const check = canViewProject(membership.role, accessRow);
    if (!check.canAccess) {
      throw new Error("Project not found");
    }

    const rows = await listActiveAccessForProject(ctx, args.projectId);
    return enrichAccessWithMember(ctx, rows);
  },
});

export const listForMember = query({
  args: {
    workspaceId: v.string(),
    memberId: v.id("workspaceMembers"),
  },
  handler: async (ctx, args) => {
    const { user, workspace, membership } = await requireWorkspaceMember(ctx, args.workspaceId);

    const isSelf = membership._id === args.memberId;
    if (!isSelf && !canManageProjectAssignments(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    const targetMember = await ctx.db.get(args.memberId);
    if (!targetMember || targetMember.workspaceId !== workspace._id) {
      throw new Error("Member not found");
    }

    if (canManageProjectAssignments(targetMember.role)) {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
        .collect();
      return projects.map((project) => ({
        id: project._id,
        workspaceId: workspace.externalId,
        projectId: project._id,
        memberId: args.memberId,
        accessLevel: "owner" as ProjectAccessLevel,
        status: "active" as const,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        projectName: project.name,
      }));
    }

    const rows = await listActiveAccessForMember(ctx, workspace._id, args.memberId);
    return enrichAccessWithProject(ctx, rows, workspace.externalId);
  },
});

export const getCurrentUserProjectAccess = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspace, membership } = await requireWorkspaceMember(ctx, args.workspaceId);
    const accessible = await getAccessibleProjectIds(ctx, workspace._id, membership);

    if (accessible === "all") {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
        .collect();
      return {
        scope: "all" as const,
        projectIds: projects.map((p) => p._id),
      };
    }

    return {
      scope: "assigned" as const,
      projectIds: [...accessible],
    };
  },
});

export const canAccessProject = query({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const { workspace, membership } = await requireWorkspaceMember(ctx, args.workspaceId);
    try {
      await assertProjectInWorkspace(ctx, args.projectId, workspace._id);
    } catch {
      return { canAccess: false, reason: "not_found" };
    }

    const accessRow = await getActiveAccessForProjectMember(
      ctx,
      args.projectId,
      membership._id,
    );
    return canViewProject(membership.role, accessRow);
  },
});
