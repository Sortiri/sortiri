import { describe, expect, it } from "vitest";
import { buildViewPulseCounts } from "../../convex/lib/viewFilters";
import type { EventRecord } from "../../convex/lib/eventsLib";

describe("saved views functions helpers", () => {
  it("buildViewPulseCounts returns category totals", () => {
    const events: EventRecord[] = [
      {
        id: "1",
        workspaceId: "ws",
        source: "github",
        category: "code_change",
        type: "git.push",
        actor: { type: "human" },
        title: "A",
        occurredAt: 1,
        createdAt: 1,
      },
      {
        id: "2",
        workspaceId: "ws",
        source: "cursor",
        category: "agent_action",
        type: "agent.run",
        actor: { type: "agent" },
        title: "B",
        occurredAt: 2,
        createdAt: 2,
      },
      {
        id: "3",
        workspaceId: "ws",
        source: "sdk",
        category: "revenue_event",
        type: "payment",
        actor: { type: "system" },
        title: "C",
        occurredAt: 3,
        createdAt: 3,
      },
    ];

    expect(buildViewPulseCounts(events)).toEqual({
      totalEvents: 3,
      agentActions: 1,
      codeChanges: 1,
      productEvents: 0,
      decisions: 0,
      observabilityEvents: 0,
      revenueEvents: 1,
      systemEvents: 0,
    });
  });
});
