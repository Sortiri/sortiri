import { describe, expect, it } from "vitest";
import { canViewEvent } from "../../convex/lib/authz";
import type { EventRecord } from "../../convex/lib/eventsLib";
import type { Id } from "../../convex/_generated/dataModel";

function makeEvent(projectId?: string): EventRecord {
  return {
    id: "evt1" as EventRecord["id"],
    workspaceId: "ws1" as EventRecord["workspaceId"],
    projectId: projectId as Id<"projects"> | undefined,
    source: "system",
    category: "system_event",
    type: "test.event",
    actor: { type: "system" },
    title: "Test",
    occurredAt: Date.now(),
    createdAt: Date.now(),
  } as EventRecord;
}

describe("impact permissions", () => {
  it("excludes events from inaccessible projects", () => {
    const accessible = new Set<Id<"projects">>(["proj_a" as Id<"projects">]);
    expect(canViewEvent(makeEvent("proj_a"), accessible)).toBe(true);
    expect(canViewEvent(makeEvent("proj_b"), accessible)).toBe(false);
  });

  it("allows workspace-level events for members with project scoping", () => {
    const accessible = new Set<Id<"projects">>(["proj_a" as Id<"projects">]);
    expect(canViewEvent(makeEvent(undefined), accessible)).toBe(true);
  });

  it("allows all projects when accessible is all", () => {
    expect(canViewEvent(makeEvent("proj_b"), "all")).toBe(true);
  });
});
