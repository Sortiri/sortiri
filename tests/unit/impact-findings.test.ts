import { describe, expect, it } from "vitest";
import {
  assertCautiousCopy,
  generateAllImpactFindings,
} from "../../convex/lib/impactFindings";
import { computeMetricsWithDelta } from "../../convex/lib/impactMetrics";
import { buildDeterministicImpactSummary } from "../../convex/lib/impactSummary";
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

describe("impact findings", () => {
  it("uses cautious copy without causation words", () => {
    expect(assertCautiousCopy("Possibly related product movement in the impact window.")).toBe(
      true,
    );
    expect(assertCautiousCopy("This change caused revenue to increase.")).toBe(false);
  });

  it("generates negative signal when payment failures increase", () => {
    const baseline = [
      makeEvent({
        type: "stripe.payment_intent.payment_failed",
        title: "Failed",
        category: "revenue_event",
        source: "stripe",
      }),
    ];
    const impact = [
      ...baseline,
      makeEvent({
        type: "stripe.payment_intent.payment_failed",
        title: "Failed 2",
        category: "revenue_event",
        source: "stripe",
      }),
      makeEvent({
        type: "stripe.charge.refunded",
        title: "Refund",
        category: "revenue_event",
        source: "stripe",
        data: { amount: 5, currency: "usd" },
      }),
    ];
    const metrics = computeMetricsWithDelta(baseline, impact);
    const findings = generateAllImpactFindings(metrics, baseline, impact);
    expect(findings.some((f) => f.type === "negative_signal")).toBe(true);
    for (const finding of findings) {
      expect(assertCautiousCopy(finding.summary)).toBe(true);
      expect(assertCautiousCopy(finding.title)).toBe(true);
    }
  });

  it("builds deterministic summary without causation", () => {
    const baseline = [
      makeEvent({
        type: "posthog.feature.used",
        title: "Feature",
        category: "product_event",
        source: "posthog",
      }),
    ];
    const impact = [
      makeEvent({
        type: "posthog.user.signed_up",
        title: "Signup",
        category: "product_event",
        source: "posthog",
      }),
    ];
    const metrics = computeMetricsWithDelta(baseline, impact);
    const findings = generateAllImpactFindings(metrics, baseline, impact);
    const summary = buildDeterministicImpactSummary({
      anchorTitle: "PR merge",
      beforeMs: 7 * 24 * 60 * 60 * 1000,
      afterMs: 7 * 24 * 60 * 60 * 1000,
      metrics,
      findings,
    });
    expect(summary.toLowerCase()).not.toContain("caused");
    expect(summary.toLowerCase()).toContain("correlation");
  });
});
