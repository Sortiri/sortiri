import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUserId } from "./lib/auth";
import {
  getCurrentUser,
  getWorkspaceMembership,
  requireWorkspaceMember,
} from "./lib/authz";
import { docToEntity } from "./lib/entitiesLib";
import { docToWorkstream } from "./lib/workstreamsLib";
import {
  assertSavedViewAccess,
  canCreatePrivateView,
  canCreateWorkspaceView,
  canDeleteView,
  canEditView,
  canPinView,
  canSeeView,
  docToSavedView,
  listViewsForWorkspace,
  recordSavedViewEvent,
  type SavedViewRecord,
} from "./lib/savedViewsLib";
import { applySavedViewFilters } from "./lib/savedViewEvents";
import { DEFAULT_VIEW_TEMPLATES } from "./lib/viewTemplates";
import {
  buildViewPulseCounts,
  getViewWindowStart,
} from "./lib/viewFilters";
import { assertWorkspaceAccess } from "./lib/eventsLib";
import {
  savedViewFiltersValidator,
  savedViewSharingValidator,
  savedViewTypeValidator,
  workspaceRoleValidator,
  insightWindowValidator,
} from "./lib/validators";
import type { InsightWindow } from "./lib/insightWindow";
import type { EntityRecord } from "./lib/entitiesLib";
import type { EventRecord } from "./lib/eventsLib";
import type { WorkstreamRecord } from "./lib/workstreamsLib";

export const createDefaults = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<SavedViewRecord[]> => {
    const { user, workspace, membership } = await requireWorkspaceMember(
      ctx,
      args.workspaceId,
    );
    if (!canCreateWorkspaceView(membership.role) && !canCreatePrivateView(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    const existing = await ctx.db
      .query("savedViews")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    const created: SavedViewRecord[] = [];
    const now = Date.now();

    for (const template of DEFAULT_VIEW_TEMPLATES) {
      const duplicate = existing.find((view) => view.type === template.type);
      if (duplicate) {
        if (canSeeView(membership, duplicate)) {
          created.push(docToSavedView(duplicate));
        }
        continue;
      }

      const viewId = await ctx.db.insert("savedViews", {
        workspaceId: workspace._id,
        name: template.name,
        description: template.description,
        type: template.type,
        visibility: "workspace",
        filters: template.filters,
        isDefault: true,
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      });

      const view = await ctx.db.get(viewId);
      if (view) {
        created.push(docToSavedView(view));
        await recordSavedViewEvent(
          ctx,
          workspace._id,
          "saved_view.created",
          { name: user.name, email: user.email },
          `Default view created: ${template.name}`,
        );
      }
    }

    return sortViews(created);
  },
});

function sortViews(views: SavedViewRecord[]): SavedViewRecord[] {
  return [...views].sort((a, b) => {
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    const aDefault = a.isDefault ? 1 : 0;
    const bDefault = b.isDefault ? 1 : 0;
    if (aDefault !== bDefault) return bDefault - aDefault;
    return a.name.localeCompare(b.name);
  });
}

export const create = mutation({
  args: {
    workspaceId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.optional(savedViewTypeValidator),
    visibility: savedViewSharingValidator,
    allowedRoles: v.optional(v.array(workspaceRoleValidator)),
    filters: savedViewFiltersValidator,
  },
  handler: async (ctx, args): Promise<SavedViewRecord> => {
    const { user, workspace, membership } = await requireWorkspaceMember(
      ctx,
      args.workspaceId,
    );

    if (args.visibility === "workspace" && !canCreateWorkspaceView(membership.role)) {
      throw new Error("Insufficient permissions");
    }
    if (args.visibility === "private" && !canCreatePrivateView(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    const now = Date.now();
    const viewId = await ctx.db.insert("savedViews", {
      workspaceId: workspace._id,
      name: args.name.trim(),
      description: args.description?.trim(),
      type: args.type ?? "custom",
      visibility: args.visibility,
      ownerUserId: args.visibility === "private" ? user.clerkUserId : undefined,
      allowedRoles: args.allowedRoles,
      filters: args.filters,
      isDefault: false,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    });

    await recordSavedViewEvent(
      ctx,
      workspace._id,
      "saved_view.created",
      { name: user.name, email: user.email },
      `Saved view created: ${args.name.trim()}`,
    );

    const view = await ctx.db.get(viewId);
    if (!view) {
      throw new Error("Failed to create view");
    }
    return docToSavedView(view);
  },
});

export const update = mutation({
  args: {
    viewId: v.id("savedViews"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(savedViewSharingValidator),
    allowedRoles: v.optional(v.array(workspaceRoleValidator)),
    filters: v.optional(savedViewFiltersValidator),
  },
  handler: async (ctx, args): Promise<SavedViewRecord> => {
    const user = await getCurrentUser(ctx);
    const view = await ctx.db.get(args.viewId);
    if (!view) {
      throw new Error("View not found");
    }

    const membership = await getWorkspaceMembership(ctx, view.workspaceId, user.clerkUserId);
    if (!membership || !canEditView(membership.role, view, user.clerkUserId)) {
      throw new Error("Insufficient permissions");
    }

    const patch: Partial<typeof view> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.description !== undefined) patch.description = args.description.trim();
    if (args.visibility !== undefined) {
      patch.visibility = args.visibility;
      patch.ownerUserId =
        args.visibility === "private" ? user.clerkUserId : undefined;
    }
    if (args.allowedRoles !== undefined) patch.allowedRoles = args.allowedRoles;
    if (args.filters !== undefined) patch.filters = args.filters;

    await ctx.db.patch(args.viewId, patch);

    await recordSavedViewEvent(
      ctx,
      view.workspaceId,
      "saved_view.updated",
      { name: user.name, email: user.email },
      `Saved view updated: ${patch.name ?? view.name}`,
    );

    const updated = await ctx.db.get(args.viewId);
    if (!updated) {
      throw new Error("View not found");
    }
    return docToSavedView(updated);
  },
});

export const deleteView = mutation({
  args: {
    viewId: v.id("savedViews"),
    confirmDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const user = await getCurrentUser(ctx);
    const view = await ctx.db.get(args.viewId);
    if (!view) {
      throw new Error("View not found");
    }

    const membership = await getWorkspaceMembership(ctx, view.workspaceId, user.clerkUserId);
    if (!membership || !canDeleteView(membership.role, view, user.clerkUserId)) {
      throw new Error("Insufficient permissions");
    }

    if (view.isDefault && !args.confirmDefault) {
      throw new Error("Default views require confirmation to delete");
    }

    await ctx.db.delete(args.viewId);

    await recordSavedViewEvent(
      ctx,
      view.workspaceId,
      "saved_view.deleted",
      { name: user.name, email: user.email },
      `Saved view deleted: ${view.name}`,
    );

    return { ok: true };
  },
});

export const pin = mutation({
  args: {
    viewId: v.id("savedViews"),
  },
  handler: async (ctx, args): Promise<SavedViewRecord> => {
    const user = await getCurrentUser(ctx);
    const view = await ctx.db.get(args.viewId);
    if (!view) {
      throw new Error("View not found");
    }

    const membership = await getWorkspaceMembership(ctx, view.workspaceId, user.clerkUserId);
    if (!membership || !canPinView(membership.role)) {
      throw new Error("Insufficient permissions");
    }
    await assertSavedViewAccess(ctx, args.viewId, membership);

    await ctx.db.patch(args.viewId, { isPinned: true, updatedAt: Date.now() });

    await recordSavedViewEvent(
      ctx,
      view.workspaceId,
      "saved_view.pinned",
      { name: user.name, email: user.email },
      `Saved view pinned: ${view.name}`,
    );

    const updated = await ctx.db.get(args.viewId);
    if (!updated) {
      throw new Error("View not found");
    }
    return docToSavedView(updated);
  },
});

export const unpin = mutation({
  args: {
    viewId: v.id("savedViews"),
  },
  handler: async (ctx, args): Promise<SavedViewRecord> => {
    const user = await getCurrentUser(ctx);
    const view = await ctx.db.get(args.viewId);
    if (!view) {
      throw new Error("View not found");
    }

    const membership = await getWorkspaceMembership(ctx, view.workspaceId, user.clerkUserId);
    if (!membership || !canPinView(membership.role)) {
      throw new Error("Insufficient permissions");
    }
    await assertSavedViewAccess(ctx, args.viewId, membership);

    await ctx.db.patch(args.viewId, { isPinned: false, updatedAt: Date.now() });

    await recordSavedViewEvent(
      ctx,
      view.workspaceId,
      "saved_view.unpinned",
      { name: user.name, email: user.email },
      `Saved view unpinned: ${view.name}`,
    );

    const updated = await ctx.db.get(args.viewId);
    if (!updated) {
      throw new Error("View not found");
    }
    return docToSavedView(updated);
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<SavedViewRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
    if (!membership) {
      throw new Error("Workspace not found");
    }
    return listViewsForWorkspace(ctx, workspace._id, membership);
  },
});

export const getById = query({
  args: {
    workspaceId: v.string(),
    viewId: v.id("savedViews"),
  },
  handler: async (ctx, args): Promise<SavedViewRecord | null> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
    if (!membership) {
      return null;
    }

    const view = await ctx.db.get(args.viewId);
    if (!view || view.workspaceId !== workspace._id) {
      return null;
    }
    if (!canSeeView(membership, view)) {
      return null;
    }
    return docToSavedView(view);
  },
});

export const applyViewToEvents = query({
  args: {
    workspaceId: v.string(),
    viewId: v.id("savedViews"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<EventRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
    if (!membership) {
      throw new Error("Workspace not found");
    }

    const view = await assertSavedViewAccess(ctx, args.viewId, membership);
    return applySavedViewFilters(ctx, workspace._id, view.filters, {
      limit: args.limit ?? 50,
    });
  },
});

export type ViewPulseResult = {
  counts: ReturnType<typeof buildViewPulseCounts>;
  recentEvents: EventRecord[];
  relatedWorkstreams: WorkstreamRecord[];
  relatedEntities: EntityRecord[];
};

export const getViewPulse = query({
  args: {
    workspaceId: v.string(),
    viewId: v.id("savedViews"),
    window: v.optional(insightWindowValidator),
  },
  handler: async (ctx, args): Promise<ViewPulseResult> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
    if (!membership) {
      throw new Error("Workspace not found");
    }

    const view = await assertSavedViewAccess(ctx, args.viewId, membership);
    const window = (args.window ?? "24h") as InsightWindow;
    const windowStart = getViewWindowStart(window);

    const events = await applySavedViewFilters(ctx, workspace._id, view.filters, {
      windowStart,
    });

    const counts = buildViewPulseCounts(events);
    const recentEvents = events.slice(0, 5);

    const workstreamIds = new Set<string>();
    for (const event of events) {
      if (event.workstreamId) {
        workstreamIds.add(event.workstreamId);
      }
    }

    const relatedWorkstreams: WorkstreamRecord[] = [];
    for (const workstreamId of Array.from(workstreamIds).slice(0, 10)) {
      const doc = await ctx.db.get(workstreamId as Id<"workstreams">);
      if (doc && doc.workspaceId === workspace._id) {
        relatedWorkstreams.push(docToWorkstream(doc));
      }
    }
    relatedWorkstreams.sort((a, b) => b.startedAt - a.startedAt);

    const entityKeys = new Map<string, EntityRecord>();
    for (const event of events) {
      if (!event.entity?.type) continue;
      const key = `${event.entity.type}:${event.entity.id ?? event.entity.name ?? ""}`;
      if (entityKeys.has(key)) continue;

      const entityDoc = await ctx.db
        .query("entities")
        .withIndex("by_workspace_type_key", (q) =>
          q
            .eq("workspaceId", workspace._id)
            .eq("type", event.entity!.type as EntityRecord["type"])
            .eq("key", event.entity!.id ?? event.entity!.name ?? ""),
        )
        .unique();

      if (entityDoc) {
        entityKeys.set(key, docToEntity(entityDoc));
      }
    }

    const relatedEntities = Array.from(entityKeys.values())
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .slice(0, 10);

    return {
      counts,
      recentEvents,
      relatedWorkstreams,
      relatedEntities,
    };
  },
});

export const getPinnedSummaries = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<{
      view: SavedViewRecord;
      eventsToday: number;
      summary: string;
    }>
  > => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
    if (!membership) {
      return [];
    }

    const views = (await listViewsForWorkspace(ctx, workspace._id, membership)).filter(
      (view) => view.isPinned,
    );

    const windowStart = getViewWindowStart("24h");
    const summaries = [];

    for (const view of views.slice(0, 5)) {
      const events = await applySavedViewFilters(ctx, workspace._id, view.filters, {
        windowStart,
      });
      const counts = buildViewPulseCounts(events);
      const parts: string[] = [];
      if (counts.totalEvents > 0) {
        parts.push(`${counts.totalEvents} event${counts.totalEvents === 1 ? "" : "s"} today`);
      }
      if (counts.codeChanges > 0) {
        parts.push(`${counts.codeChanges} code change${counts.codeChanges === 1 ? "" : "s"}`);
      }
      if (counts.productEvents > 0) {
        parts.push(`${counts.productEvents} product event${counts.productEvents === 1 ? "" : "s"}`);
      }
      if (counts.revenueEvents > 0) {
        parts.push(`${counts.revenueEvents} revenue event${counts.revenueEvents === 1 ? "" : "s"}`);
      }
      if (counts.decisions > 0) {
        parts.push(`${counts.decisions} decision${counts.decisions === 1 ? "" : "s"}`);
      }

      summaries.push({
        view,
        eventsToday: counts.totalEvents,
        summary: parts.length > 0 ? parts.join(" · ") : "No matching events today",
      });
    }

    return summaries;
  },
});
