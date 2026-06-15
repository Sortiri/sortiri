import { describe, expect, it } from "vitest";
import {
  canViewProject,
  filterEventsByProjectAccess,
  intersectProjectIds,
  projectAccessAllowsWrite,
  workspaceRoleSeesAllProjects,
} from "../../convex/lib/projectAccessLib";
import {
  canManageProjectAccess,
  canWriteProjectData,
} from "../../src/types/project-access";
import type { EventRecord } from "../../convex/lib/eventsLib";
import type { Id } from "../../convex/_generated/dataModel";

function event(projectId?: string): EventRecord {
  return {
    id: "e1",
    workspaceId: "ws1",
    projectId,
    source: "system",
    category: "system_event",
    type: "test.event",
    actor: { type: "system", name: "Sortiri" },
    title: "Test",
    visibility: projectId ? "primary" : "primary",
    occurredAt: Date.now(),
    createdAt: Date.now(),
  } as EventRecord;
}

describe("project access permissions", () => {
  it("owner/admin see all projects", () => {
    expect(workspaceRoleSeesAllProjects("owner")).toBe(true);
    expect(workspaceRoleSeesAllProjects("admin")).toBe(true);
    expect(canViewProject("admin", null).canAccess).toBe(true);
  });

  it("member cannot access unassigned project", () => {
    expect(canViewProject("member", null).canAccess).toBe(false);
    expect(canViewProject("viewer", null).canAccess).toBe(false);
  });

  it("member can access assigned project", () => {
    const row = {
      status: "active" as const,
      accessLevel: "viewer" as const,
    };
    expect(canViewProject("member", row as never).canAccess).toBe(true);
  });

  it("viewer can read but not write assigned project", () => {
    expect(canWriteProjectData("viewer")).toBe(false);
    expect(projectAccessAllowsWrite("viewer")).toBe(false);
    expect(canWriteProjectData("editor")).toBe(true);
  });

  it("only project owner can manage access", () => {
    expect(canManageProjectAccess("owner")).toBe(true);
    expect(canManageProjectAccess("manager")).toBe(false);
  });

  it("filters inaccessible project events", () => {
    const accessible = new Set(["p1" as Id<"projects">]);
    const events = [
      event("p1"),
      event("p2"),
      event(undefined),
    ];
    const filtered = filterEventsByProjectAccess(events, accessible);
    expect(filtered.map((e) => e.projectId)).toEqual(["p1", undefined]);
  });

  it("intersects view project filters with accessible set", () => {
    const accessible = new Set(["p1" as Id<"projects">, "p2" as Id<"projects">]);
    const result = intersectProjectIds(
      ["p1" as Id<"projects">, "p3" as Id<"projects">],
      accessible,
    );
    expect(result).toEqual(["p1"]);
  });
});
