import { describe, expect, it } from "vitest";
import {
  filterEventsByProjectAccess,
  filterInsightFindingEvidence,
  shouldHideEntity,
} from "../../convex/lib/projectAccessLib";
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
    visibility: "primary",
    occurredAt: Date.now(),
    createdAt: Date.now(),
  } as EventRecord;
}

describe("query permission filters", () => {
  it("keeps workspace-level primary events for scoped members", () => {
    const accessible = new Set(["p1" as Id<"projects">]);
    const filtered = filterEventsByProjectAccess(
      [event("p1"), event("p2"), event(undefined)],
      accessible,
      { workspaceLevelPrimaryOnly: true },
    );
    expect(filtered.map((row) => row.projectId)).toEqual(["p1", undefined]);
  });

  it("hides entities tied only to inaccessible projects", () => {
    const accessible = new Set(["p1" as Id<"projects">]);
    expect(shouldHideEntity(["p2" as Id<"projects">], accessible)).toBe(true);
    expect(
      shouldHideEntity(
        ["p1" as Id<"projects">, "p2" as Id<"projects">],
        accessible,
      ),
    ).toBe(false);
    expect(shouldHideEntity([], accessible)).toBe(false);
  });

  it("strips inaccessible insight evidence", () => {
    const accessibleEvents = new Set(["e1" as Id<"events">]);
    const accessibleWorkstreams = new Set(["w1" as Id<"workstreams">]);
    const finding = {
      evidenceEventIds: ["e1" as Id<"events">, "e2" as Id<"events">],
      evidenceWorkstreamIds: ["w1" as Id<"workstreams">, "w2" as Id<"workstreams">],
    };
    const filtered = filterInsightFindingEvidence(
      finding,
      accessibleEvents,
      accessibleWorkstreams,
    );
    expect(filtered).toEqual({
      evidenceEventIds: ["e1"],
      evidenceWorkstreamIds: ["w1"],
    });
  });

  it("drops findings with no accessible evidence", () => {
    const filtered = filterInsightFindingEvidence(
      { evidenceEventIds: ["e2" as Id<"events">] },
      new Set(["e1" as Id<"events">]),
      new Set(),
    );
    expect(filtered).toBeNull();
  });
});
