import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { requireWorkspaceRole } from "./lib/authz";
import { assertWorkspaceAccess } from "./lib/eventsLib";
import {
  deletePinDoc,
  findPinForWorkstream,
  insertPinDoc,
  listPinnedForWorkspace,
  type PinnedReplayWithWorkstream,
} from "./lib/pinnedReplaysLib";
import { assertWorkstreamAccess } from "./lib/workstreamsLib";
import type { Id } from "./_generated/dataModel";

export const pin = mutation({
  args: {
    workspaceId: v.string(),
    workstreamId: v.id("workstreams"),
    label: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ pinId: Id<"pinnedReplays">; duplicate: boolean }> => {
    const userId = await requireUserId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin", "member"]);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    await assertWorkstreamAccess(ctx, args.workstreamId, userId);

    const existing = await findPinForWorkstream(ctx, workspace._id, args.workstreamId);
    if (existing) {
      return { pinId: existing._id, duplicate: true };
    }

    const pinId = await insertPinDoc(ctx, {
      workspaceId: workspace._id,
      workstreamId: args.workstreamId,
      label: args.label,
      note: args.note,
      pinnedBy: {
        userId,
        email: identity?.email,
        name: identity?.name,
      },
    });

    return { pinId, duplicate: false };
  },
});

export const unpin = mutation({
  args: {
    workspaceId: v.string(),
    workstreamId: v.id("workstreams"),
  },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const userId = await requireUserId(ctx);
    await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin", "member"]);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    await assertWorkstreamAccess(ctx, args.workstreamId, userId);

    const existing = await findPinForWorkstream(ctx, workspace._id, args.workstreamId);
    if (existing) {
      await deletePinDoc(ctx, existing._id);
    }

    return { ok: true };
  },
});

export const toggle = mutation({
  args: {
    workspaceId: v.string(),
    workstreamId: v.id("workstreams"),
  },
  handler: async (ctx, args): Promise<{ pinned: boolean; pinId?: Id<"pinnedReplays"> }> => {
    const userId = await requireUserId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin", "member"]);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    await assertWorkstreamAccess(ctx, args.workstreamId, userId);

    const existing = await findPinForWorkstream(ctx, workspace._id, args.workstreamId);
    if (existing) {
      await deletePinDoc(ctx, existing._id);
      return { pinned: false };
    }

    const pinId = await insertPinDoc(ctx, {
      workspaceId: workspace._id,
      workstreamId: args.workstreamId,
      pinnedBy: {
        userId,
        email: identity?.email,
        name: identity?.name,
      },
    });

    return { pinned: true, pinId };
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<PinnedReplayWithWorkstream[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    return listPinnedForWorkspace(ctx, workspace._id, args.limit ?? 10);
  },
});

export const isPinned = query({
  args: {
    workspaceId: v.string(),
    workstreamId: v.id("workstreams"),
  },
  handler: async (ctx, args): Promise<{ pinned: boolean; pinId?: Id<"pinnedReplays"> }> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    await assertWorkstreamAccess(ctx, args.workstreamId, userId);

    const existing = await findPinForWorkstream(ctx, workspace._id, args.workstreamId);
    if (!existing) {
      return { pinned: false };
    }

    return { pinned: true, pinId: existing._id };
  },
});
