import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { WorkspaceRole } from "../../src/types/workspace-members";
import { insertEvent } from "./eventsLib";
import type { SavedViewFilters } from "./viewFilters";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type SavedViewType =
  | "engineering"
  | "product"
  | "revenue"
  | "growth"
  | "support"
  | "executive"
  | "custom";

export type SavedViewSharing = "workspace" | "private";

export type SavedViewRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: SavedViewType;
  visibility: SavedViewSharing;
  ownerUserId?: string;
  allowedRoles?: WorkspaceRole[];
  filters: SavedViewFilters;
  isDefault?: boolean;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
};

export function docToSavedView(doc: Doc<"savedViews">): SavedViewRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    name: doc.name,
    description: doc.description,
    type: doc.type,
    visibility: doc.visibility,
    ownerUserId: doc.ownerUserId,
    allowedRoles: doc.allowedRoles,
    filters: doc.filters as SavedViewFilters,
    isDefault: doc.isDefault,
    isPinned: doc.isPinned,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function canCreateWorkspaceView(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function canCreatePrivateView(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

export function canSeeView(
  membership: Doc<"workspaceMembers">,
  view: Doc<"savedViews">,
): boolean {
  if (membership.status !== "active") {
    return false;
  }

  if (view.visibility === "private") {
    return view.ownerUserId === membership.clerkUserId;
  }

  if (view.allowedRoles && view.allowedRoles.length > 0) {
    return view.allowedRoles.includes(membership.role);
  }

  return true;
}

export function canEditView(
  role: WorkspaceRole,
  view: Doc<"savedViews">,
  userId: string,
): boolean {
  if (view.visibility === "private") {
    return view.ownerUserId === userId;
  }
  return role === "owner" || role === "admin";
}

export function canDeleteView(
  role: WorkspaceRole,
  view: Doc<"savedViews">,
  userId: string,
): boolean {
  if (view.isDefault) {
    return role === "owner" || role === "admin";
  }
  if (view.visibility === "private") {
    return view.ownerUserId === userId;
  }
  return role === "owner" || role === "admin";
}

export function canPinView(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

export function sortSavedViews(views: SavedViewRecord[]): SavedViewRecord[] {
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

export async function listViewsForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  membership: Doc<"workspaceMembers">,
): Promise<SavedViewRecord[]> {
  const docs = await ctx.db
    .query("savedViews")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  return sortSavedViews(
    docs.filter((doc) => canSeeView(membership, doc)).map(docToSavedView),
  );
}

export async function assertSavedViewAccess(
  ctx: DbReadCtx,
  viewId: Id<"savedViews">,
  membership: Doc<"workspaceMembers">,
): Promise<Doc<"savedViews">> {
  const view = await ctx.db.get(viewId);
  if (!view) {
    throw new Error("View not found");
  }
  if (!canSeeView(membership, view)) {
    throw new Error("View not found");
  }
  return view;
}

export async function recordSavedViewEvent(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
  type:
    | "saved_view.created"
    | "saved_view.updated"
    | "saved_view.deleted"
    | "saved_view.pinned"
    | "saved_view.unpinned",
  actor: { name?: string; email?: string },
  summary: string,
): Promise<void> {
  await insertEvent(ctx, {
    workspaceId,
    source: "system",
    category: "system_event",
    type,
    visibility: "primary",
    importance: "normal",
    severity: "info",
    actor: {
      type: "human",
      name: actor.name ?? actor.email ?? "Team member",
    },
    title: summary,
    summary,
  });
}
