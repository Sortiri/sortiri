import { describe, expect, it } from "vitest";
import { generateDeterministicFindings } from "../../convex/lib/insightRules";
import type { EventRecord } from "../../convex/lib/eventsLib";

function makeEvent(overrides: Partial<EventRecord> & Pick<EventRecord, "type" | "title">): EventRecord {
  return {
    id: crypto.randomUUID() as EventRecord["id"],
    workspaceId: "ws1" as EventRecord["workspaceId"],
    source: "system",
    category: "system_event",
    actor: { type: "system", name: "Sortiri" },
    occurredAt: Date.now(),
    createdAt: Date.now(),
    ...overrides,
  } as EventRecord;
}

describe("insight rules", () => {
  const windowEnd = Date.now();
  const windowStart = windowEnd - 7 * 24 * 60 * 60 * 1000;

  it("emits team access changed finding when member events exist", () => {
    const events = [
      makeEvent({
        type: "workspace.member_invited",
        title: "Invited teammate",
        category: "system_event",
        source: "system",
      }),
    ];
    const findings = generateDeterministicFindings({
      events,
      workstreams: [],
      windowStart,
      windowEnd,
    });
    expect(findings.some((f) => f.title === "Team access changed")).toBe(true);
  });

  it("emits error finding for command failures", () => {
    const events = [
      makeEvent({
        type: "command.failed",
        title: "Test Command Failed",
        category: "system_event",
        source: "cli",
        severity: "error",
      }),
    ];
    const findings = generateDeterministicFindings({
      events,
      workstreams: [],
      windowStart,
      windowEnd,
    });
    expect(findings.some((f) => f.title === "Command failure detected")).toBe(true);
    expect(findings.some((f) => f.type === "error" && f.severity === "warning")).toBe(true);
  });
});
