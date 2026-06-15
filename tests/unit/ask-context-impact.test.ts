import { describe, expect, it } from "vitest";
import { assertCautiousCopy } from "../../convex/lib/impactFindings";
import { buildDeterministicImpactSummary } from "../../convex/lib/impactSummary";
import { computeMetricsWithDelta } from "../../convex/lib/impactMetrics";
import type { EventRecord } from "../../convex/lib/eventsLib";

function makeEvent(overrides: Partial<EventRecord> & Pick<EventRecord, "type" | "title">): EventRecord {
  return {
    id: crypto.randomUUID() as EventRecord["id"],
    workspaceId: "ws1" as EventRecord["workspaceId"],
    source: "posthog",
    category: "product_event",
    actor: { type: "human", id: "u1" },
    occurredAt: Date.now(),
    createdAt: Date.now(),
    ...overrides,
  } as EventRecord;
}

describe("ask context impact", () => {
  it("impact summary prompt fragments avoid causation language", () => {
    const baseline = [makeEvent({ type: "posthog.feature.used", title: "Feature" })];
    const impact = [
      makeEvent({ type: "posthog.user.signed_up", title: "Signup" }),
    ];
    const metrics = computeMetricsWithDelta(baseline, impact);
    const summary = buildDeterministicImpactSummary({
      anchorTitle: "Deploy",
      beforeMs: 7 * 24 * 60 * 60 * 1000,
      afterMs: 7 * 24 * 60 * 60 * 1000,
      metrics,
      findings: [],
    });
    const promptPrefix =
      "You are answering from an impact analysis context. Do not claim causation.";
    expect(assertCautiousCopy(summary)).toBe(true);
    expect(assertCautiousCopy(promptPrefix)).toBe(true);
    expect(summary.toLowerCase()).not.toMatch(/\bcaused\b|\bdefinitely\b|\bproved\b/);
  });
});
