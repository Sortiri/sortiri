import { describe, expect, it } from "vitest";
import { resolveActiveWorkspaceId } from "../../convex/lib/workspacesLib";

describe("resolveActiveWorkspaceId", () => {
  const workspaces = [
    { id: "ws-a", userId: "u1", name: "A", createdAt: "", updatedAt: "" },
    { id: "ws-b", userId: "u1", name: "B", createdAt: "", updatedAt: "" },
  ];

  it("returns null when no workspaces", () => {
    expect(resolveActiveWorkspaceId("ws-a", [])).toBeNull();
  });

  it("keeps stored id when user is a member", () => {
    expect(resolveActiveWorkspaceId("ws-b", workspaces)).toBe("ws-b");
  });

  it("falls back to first workspace when stored id is stale", () => {
    expect(resolveActiveWorkspaceId("ws-removed", workspaces)).toBe("ws-a");
  });

  it("uses first workspace when no stored preference", () => {
    expect(resolveActiveWorkspaceId(null, workspaces)).toBe("ws-a");
  });
});
