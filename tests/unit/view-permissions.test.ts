import { describe, expect, it } from "vitest";
import {
  canCreatePrivateView,
  canCreateWorkspaceView,
  canDeleteView,
  canEditView,
  canSeeView,
} from "../../convex/lib/savedViewsLib";
import { intersectProjectIds } from "../../convex/lib/projectAccessLib";
import type { Doc, Id } from "../../convex/_generated/dataModel";

function member(
  overrides: Partial<Doc<"workspaceMembers">> = {},
): Doc<"workspaceMembers"> {
  return {
    _id: "member1" as Doc<"workspaceMembers">["_id"],
    _creationTime: 0,
    workspaceId: "ws1" as Doc<"workspaceMembers">["workspaceId"],
    clerkUserId: "user_1",
    role: "member",
    status: "active",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function view(
  overrides: Partial<Doc<"savedViews">> = {},
): Doc<"savedViews"> {
  return {
    _id: "view1" as Doc<"savedViews">["_id"],
    _creationTime: 0,
    workspaceId: "ws1" as Doc<"savedViews">["workspaceId"],
    name: "Engineering",
    type: "engineering",
    visibility: "workspace",
    filters: { visibility: "primary" },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("view permissions", () => {
  it("owner/admin can create workspace views", () => {
    expect(canCreateWorkspaceView("owner")).toBe(true);
    expect(canCreateWorkspaceView("admin")).toBe(true);
    expect(canCreateWorkspaceView("member")).toBe(false);
    expect(canCreateWorkspaceView("viewer")).toBe(false);
  });

  it("members can create private views but viewers cannot", () => {
    expect(canCreatePrivateView("member")).toBe(true);
    expect(canCreatePrivateView("viewer")).toBe(false);
  });

  it("private views are only visible to owner", () => {
    const privateView = view({ visibility: "private", ownerUserId: "user_1" });
    expect(canSeeView(member({ clerkUserId: "user_1" }), privateView)).toBe(true);
    expect(canSeeView(member({ clerkUserId: "user_2" }), privateView)).toBe(false);
  });

  it("workspace views are visible to active members", () => {
    const workspaceView = view({ visibility: "workspace" });
    expect(canSeeView(member(), workspaceView)).toBe(true);
    expect(canSeeView(member({ status: "removed" }), workspaceView)).toBe(false);
  });

  it("allowedRoles restricts workspace view visibility", () => {
    const restricted = view({ allowedRoles: ["admin", "owner"] });
    expect(canSeeView(member({ role: "admin" }), restricted)).toBe(true);
    expect(canSeeView(member({ role: "member" }), restricted)).toBe(false);
  });

  it("edit/delete rules respect visibility and defaults", () => {
    const privateView = view({ visibility: "private", ownerUserId: "user_1" });
    expect(canEditView("viewer", privateView, "user_1")).toBe(true);
    expect(canEditView("admin", privateView, "user_2")).toBe(false);

    const workspaceView = view({ visibility: "workspace" });
    expect(canEditView("admin", workspaceView, "user_2")).toBe(true);
    expect(canEditView("member", workspaceView, "user_2")).toBe(false);

    const defaultView = view({ isDefault: true });
    expect(canDeleteView("member", defaultView, "user_1")).toBe(false);
    expect(canDeleteView("owner", defaultView, "user_1")).toBe(true);
  });

  it("intersects project filters with accessible project set", () => {
    const accessible = new Set(["p1" as Id<"projects">]);
    const result = intersectProjectIds(
      ["p1" as Id<"projects">, "p2" as Id<"projects">],
      accessible,
    );
    expect(result).toEqual(["p1"]);
  });
});
