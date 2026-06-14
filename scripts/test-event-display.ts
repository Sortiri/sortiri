/**
 * Event display classifier smoke test.
 *
 * Usage: npm run test:event-display
 */

import {
  classifyEventForDisplay,
  filterPrimaryEventRecords,
  filterEventsForInsights,
  matchesVisibilityFilter,
} from "../convex/lib/eventDisplay";
import type { Doc } from "../convex/_generated/dataModel";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function classify(overrides: Parameters<typeof classifyEventForDisplay>[0]) {
  return classifyEventForDisplay(overrides);
}

function main() {
  const started = classify({
    source: "cli",
    category: "system_event",
    type: "command.started",
    title: "Started command: echo hello",
    data: { command: "echo hello" },
  });
  assert(started.visibility === "debug", "command.started should be debug");
  assert(started.importance === "low", "command.started should be low importance");

  const failed = classify({
    source: "cli",
    category: "system_event",
    type: "command.failed",
    title: "Command failed: npm test",
    data: { command: "npm test" },
  });
  assert(failed.visibility === "primary", "command.failed should be primary");
  assert(failed.importance === "high", "command.failed should be high");

  const echoCompleted = classify({
    source: "cli",
    category: "system_event",
    type: "command.completed",
    title: "Command passed: echo hello",
    data: { command: "echo hello" },
  });
  assert(echoCompleted.visibility === "debug", "echo completed should be debug");

  const buildCompleted = classify({
    source: "cli",
    category: "system_event",
    type: "command.completed",
    title: "Command passed: npm run build",
    data: { command: "npm run build" },
  });
  assert(buildCompleted.visibility === "primary", "npm run build should be primary");

  const product = classify({
    source: "posthog",
    category: "product_event",
    type: "user.signed_up",
    title: "User signed up",
  });
  assert(product.visibility === "primary", "product_event should be primary");

  const testEvent = classify({
    source: "github",
    category: "system_event",
    type: "github.test_event",
    title: "GitHub test event",
  });
  assert(testEvent.visibility === "debug", "github.test_event should be debug");

  const fileWithWorkstream = classify({
    source: "watcher",
    category: "code_change",
    type: "file.changed",
    title: "Changed src/foo.ts",
    workstreamId: "ws123",
    entity: { type: "file", name: "src/foo.ts" },
  });
  assert(fileWithWorkstream.visibility === "primary", "file.changed with workstream should be primary");

  const fileWithoutWorkstream = classify({
    source: "watcher",
    category: "code_change",
    type: "file.changed",
    title: "Changed src/foo.ts",
    entity: { type: "file", name: "src/foo.ts" },
  });
  assert(
    fileWithoutWorkstream.visibility === "debug",
    "file.changed without workstream should be debug",
  );

  const primaryFilter = filterPrimaryEventRecords([
    { source: "cli", category: "system_event", type: "command.started", title: "x", visibility: "debug" },
    { source: "cli", category: "system_event", type: "command.completed", title: "y", visibility: "primary" },
  ]);
  assert(primaryFilter.length === 1, "filterPrimaryEventRecords should keep primary only");

  const insightsFilter = filterEventsForInsights([
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
  assert(insightsFilter.length === 1, "insights should include debug only when error severity");

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
  assert(
    !matchesVisibilityFilter(hiddenDoc, "primary"),
    "hidden events should not match primary filter",
  );

  console.log("All event display classifier tests passed.");
}

main();
