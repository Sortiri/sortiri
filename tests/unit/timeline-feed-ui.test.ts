import { describe, expect, it } from "vitest";
import {
  filterEventsByTimeRange,
  groupEventsByRecency,
} from "@/lib/platform/timeline-grouping";
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

describe("timeline feed ui grouping", () => {
  const now = Date.UTC(2026, 5, 17, 15, 0, 0);

  it("groups events by recency buckets", () => {
    const groups = groupEventsByRecency(
      [eventAt(now), eventAt(now - 10 * 24 * 60 * 60 * 1000)],
      now,
    );
    expect(groups.map((g) => g.label)).toContain("Today");
    expect(groups.map((g) => g.label)).toContain("Older");
  });

  it("filters events by time range", () => {
    const events = [eventAt(now), eventAt(now - 10 * 24 * 60 * 60 * 1000)];
    const filtered = filterEventsByTimeRange(events, "7d", now);
    expect(filtered).toHaveLength(1);
  });
});
