import { describe, expect, it } from "vitest";
import {
  classifyEventForDisplay,
  filterEventsForInsights,
  filterPrimaryEventRecords,
  matchesVisibilityFilter,
} from "../../convex/lib/eventDisplay";
import type { Doc } from "../../convex/_generated/dataModel";

function classify(overrides: Parameters<typeof classifyEventForDisplay>[0]) {
  return classifyEventForDisplay(overrides);
}

describe("event display classifier", () => {
  it("classifies command.started as debug/low", () => {
    const result = classify({
      source: "cli",
      category: "system_event",
      type: "command.started",
      title: "Started command: echo hello",
      data: { command: "echo hello" },
    });
    expect(result.visibility).toBe("debug");
    expect(result.importance).toBe("low");
  });

  it("classifies command.failed as primary/high", () => {
    const result = classify({
      source: "cli",
      category: "system_event",
      type: "command.failed",
      title: "Command failed: npm test",
      data: { command: "npm test" },
    });
    expect(result.visibility).toBe("primary");
    expect(result.importance).toBe("high");
  });

  it("classifies echo command.completed as debug", () => {
    const result = classify({
      source: "cli",
      category: "system_event",
      type: "command.completed",
      title: "Command passed: echo hello",
      data: { command: "echo hello" },
    });
    expect(result.visibility).toBe("debug");
  });

  it("classifies product_event as primary", () => {
    const result = classify({
      source: "posthog",
      category: "product_event",
      type: "user.signed_up",
      title: "User signed up",
    });
    expect(result.visibility).toBe("primary");
  });

  it("classifies revenue_event as primary", () => {
    const result = classify({
      source: "sdk",
      category: "revenue_event",
      type: "payment.received",
      title: "Payment received",
    });
    expect(result.visibility).toBe("primary");
  });

  it("classifies company_decision as primary/high", () => {
    const result = classify({
      source: "manual",
      category: "company_decision",
      type: "decision.made",
      title: "Changed positioning",
    });
    expect(result.visibility).toBe("primary");
    expect(result.importance).toBe("high");
  });

  it("classifies GitHub PR opened as primary", () => {
    const result = classify({
      source: "github",
      category: "code_change",
      type: "github.pull_request.opened",
      title: "PR opened",
    });
    expect(result.visibility).toBe("primary");
  });

  it("classifies watcher file.changed with workstream as primary", () => {
    const result = classify({
      source: "watcher",
      category: "code_change",
      type: "file.changed",
      title: "Changed src/foo.ts",
      workstreamId: "ws123" as never,
      entity: { type: "file", name: "src/foo.ts" },
    });
    expect(result.visibility).toBe("primary");
  });

  it("classifies watcher file.changed without workstream as debug", () => {
    const result = classify({
      source: "watcher",
      category: "code_change",
      type: "file.changed",
      title: "Changed src/foo.ts",
      entity: { type: "file", name: "src/foo.ts" },
    });
    expect(result.visibility).toBe("debug");
  });

  it("filterPrimaryEventRecords keeps primary only", () => {
    const result = filterPrimaryEventRecords([
      { source: "cli", category: "system_event", type: "command.started", title: "x", visibility: "debug" },
      { source: "cli", category: "system_event", type: "command.completed", title: "y", visibility: "primary" },
    ]);
    expect(result).toHaveLength(1);
  });

  it("filterEventsForInsights includes debug only on error severity", () => {
    const result = filterEventsForInsights([
      {
        source: "cli",
        category: "system_event",
        type: "command.started",
        title: "x",
        visibility: "debug",
        severity: "info",
      },
      {
        source: "cli",
        category: "system_event",
        type: "command.failed",
        title: "y",
        visibility: "debug",
        severity: "error",
      },
    ]);
    expect(result).toHaveLength(1);
  });

  it("excludes user-hidden events from primary filter", () => {
    const hiddenDoc = {
      source: "cli",
      category: "system_event",
      type: "command.completed",
      title: "Command passed: npm test",
      visibility: "primary",
      importance: "normal",
      displayReason: "test",
      isUserHidden: true,
    } as Doc<"events">;
    expect(matchesVisibilityFilter(hiddenDoc, "primary")).toBe(false);
  });
});
