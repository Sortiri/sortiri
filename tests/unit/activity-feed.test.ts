import { describe, expect, it } from "vitest";
import { groupEventsByDay } from "@/lib/events/format";
import type { TimelineEvent } from "@/types/events";

function eventAt(ms: number): TimelineEvent {
  return {
    id: `ev-${ms}`,
    workspaceId: "ws",
    source: "cli",
    category: "agent_action",
    type: "test",
    actor: { type: "agent", name: "Test" },
    title: "Test",
    occurredAt: ms,
    createdAt: ms,
    visibility: "primary",
    importance: "normal",
  };
}

describe("activity feed grouping", () => {
  it("groups events by day label", () => {
    const now = Date.now();
    const groups = groupEventsByDay([eventAt(now), eventAt(now - 1000)]);
    expect(groups.length).toBeGreaterThanOrEqual(1);
    expect(groups[0]?.events.length).toBe(2);
  });

  it("splits events on different days", () => {
    const groups = groupEventsByDay([
      eventAt(Date.UTC(2026, 5, 17, 12)),
      eventAt(Date.UTC(2026, 5, 16, 12)),
    ]);
    expect(groups.length).toBe(2);
  });
});
