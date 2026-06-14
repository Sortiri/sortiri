import { describe, expect, it } from "vitest";
import {
  canCreateApiKeys,
  canManageMembers,
  canManageSources,
  canManageWorkspace,
  canWriteWorkspaceData,
} from "../../convex/lib/authz";
import { buildMembershipCapabilities } from "../../src/types/workspace-members";

describe("role permissions", () => {
  it("owner can manage members and workspace", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageWorkspace("owner")).toBe(true);
    expect(canCreateApiKeys("owner")).toBe(true);
    expect(canManageSources("owner")).toBe(true);
    expect(canWriteWorkspaceData("owner")).toBe(true);
  });

  it("admin can manage sources and api keys but not workspace lifecycle", () => {
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageWorkspace("admin")).toBe(false);
    expect(canCreateApiKeys("admin")).toBe(true);
    expect(canManageSources("admin")).toBe(true);
    expect(canWriteWorkspaceData("admin")).toBe(true);
  });

  it("member cannot create api keys", () => {
    expect(canManageMembers("member")).toBe(false);
    expect(canCreateApiKeys("member")).toBe(false);
    expect(canWriteWorkspaceData("member")).toBe(true);
  });

  it("viewer cannot mutate workspace data", () => {
    const caps = buildMembershipCapabilities("viewer", "active");
    expect(caps.canWriteWorkspaceData).toBe(false);
    expect(caps.canCreateApiKeys).toBe(false);
    expect(caps.canManageMembers).toBe(false);
    expect(caps.canManageViews).toBe(false);
    expect(caps.canCreatePrivateViews).toBe(false);
    expect(canWriteWorkspaceData("viewer")).toBe(false);
  });

  it("member can create private views but not manage workspace views", () => {
    const caps = buildMembershipCapabilities("member", "active");
    expect(caps.canManageViews).toBe(false);
    expect(caps.canCreatePrivateViews).toBe(true);
  });

  it("removed members have no capabilities", () => {
    const caps = buildMembershipCapabilities("owner", "removed");
    expect(caps.canManageWorkspace).toBe(false);
    expect(caps.canWriteWorkspaceData).toBe(false);
  });
});
