import { describe, expect, it } from "vitest";
import { generateLinksForEvents } from "../../convex/lib/linkRules";
import type { EventRecord } from "../../convex/lib/eventsLib";

function event(
  id: string,
  overrides: Partial<EventRecord> & Pick<EventRecord, "type" | "title" | "occurredAt">,
): EventRecord {
  return {
    id: id as EventRecord["id"],
    workspaceId: "ws1" as EventRecord["workspaceId"],
    source: "cursor",
    category: "code_change",
    actor: { type: "agent", name: "Cursor" },
    createdAt: overrides.occurredAt,
    ...overrides,
  } as EventRecord;
}

describe("link rules", () => {
  it("links adjacent events in same workstream", () => {
    const ws = "ws-stream" as EventRecord["workstreamId"];
    const events = [
      event("e1", {
        type: "agent.workstream_started",
        title: "Start",
        occurredAt: 1000,
        workstreamId: ws,
      }),
      event("e2", {
        type: "file.changed",
        title: "Change file",
        occurredAt: 2000,
        workstreamId: ws,
        entity: { type: "file", name: "app/page.tsx" },
      }),
    ];
    const links = generateLinksForEvents(events, []);
    expect(links.some((l) => l.type === "same_workstream")).toBe(true);
  });

  it("links same file changes", () => {
    const events = [
      event("e1", {
        type: "file.changed",
        title: "First change",
        occurredAt: 1000,
        entity: { type: "file", name: "app/page.tsx" },
      }),
      event("e2", {
        type: "file.changed",
        title: "Second change",
        occurredAt: 2000,
        entity: { type: "file", name: "app/page.tsx" },
      }),
    ];
    const links = generateLinksForEvents(events, []);
    expect(links.some((l) => l.type === "same_file")).toBe(true);
  });

  it("links GitHub PR events", () => {
    const events = [
      event("e1", {
        source: "github",
        type: "github.pull_request.opened",
        title: "Test PR #42",
        occurredAt: 1000,
        entity: { type: "pull_request", name: "#42" },
        data: { repo: "sortiri/example", number: 42 },
      }),
      event("e2", {
        source: "github",
        type: "github.pull_request.merged",
        title: "Test PR #42 merged",
        occurredAt: 2000,
        entity: { type: "pull_request", name: "#42" },
        data: { repo: "sortiri/example", number: 42 },
      }),
    ];
    const links = generateLinksForEvents(events, []);
    expect(links.some((l) => l.type === "same_pr")).toBe(true);
  });

  it("uses moderate confidence for decision to code links", () => {
    const events = [
      event("e1", {
        source: "manual",
        category: "company_decision",
        type: "decision.made",
        title: "Ship new homepage",
        occurredAt: 1000,
      }),
      event("e2", {
        type: "file.changed",
        title: "Update homepage",
        occurredAt: 5000,
        entity: { type: "file", name: "app/page.tsx" },
      }),
    ];
    const links = generateLinksForEvents(events, []);
    const decisionLink = links.find((l) => l.type === "led_to" || l.type === "related");
    if (decisionLink) {
      expect(decisionLink.confidence).toBeLessThanOrEqual(0.75);
    }
  });
});
