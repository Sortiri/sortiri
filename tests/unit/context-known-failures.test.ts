import { describe, expect, it } from "vitest";
import { normalizeFailureType } from "../../convex/lib/failurePatterns";
import type { EventRecord } from "../../convex/lib/eventsLib";

function makeEvent(overrides: Partial<EventRecord>): EventRecord {
  return {
    id: "e1",
    workspaceId: "ws1",
    source: "system",
    category: "system_event",
    type: "command.failed",
    actor: { type: "system", name: "CI" },
    title: "Build failed",
    visibility: "primary",
    importance: "normal",
    occurredAt: Date.now(),
    ...overrides,
  } as EventRecord;
}

describe("known failure normalization", () => {
  it("detects command failures", () => {
    const type = normalizeFailureType(
      makeEvent({ type: "command.failed", title: "npm test failed" }),
    );
    expect(type).toBe("command.failed");
  });

  it("detects stripe webhook failures", () => {
    const type = normalizeFailureType(
      makeEvent({ type: "stripe.webhook_fail", title: "Stripe webhook rejected" }),
    );
    expect(type).toBe("stripe.webhook_failure");
  });

  it("ignores non-failure events", () => {
    const type = normalizeFailureType(
      makeEvent({ type: "build.passed", title: "Build passed" }),
    );
    expect(type).toBeNull();
  });
});
