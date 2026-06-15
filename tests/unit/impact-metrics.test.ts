import { describe, expect, it } from "vitest";
import {
  computeMetricsWithDelta,
  computeProductMetrics,
  computeRevenueMetrics,
  percentageChange,
} from "../../convex/lib/impactMetrics";
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

describe("impact metrics", () => {
  it("groups revenue by currency without mixing amounts", () => {
    const events = [
      makeEvent({
        type: "stripe.payment_intent.succeeded",
        title: "USD payment",
        category: "revenue_event",
        source: "stripe",
        data: { amount: 10, currency: "usd" },
      }),
      makeEvent({
        type: "stripe.payment_intent.succeeded",
        title: "EUR payment",
        category: "revenue_event",
        source: "stripe",
        data: { amount: 20, currency: "eur" },
      }),
    ];
    const metrics = computeRevenueMetrics(events);
    expect(metrics.grossRevenueAmount.usd).toBe(10);
    expect(metrics.grossRevenueAmount.eur).toBe(20);
  });

  it("computes product signup counts", () => {
    const events = [
      makeEvent({
        type: "posthog.user.signed_up",
        title: "Signup",
        category: "product_event",
        source: "posthog",
        actor: { type: "human", id: "u1", email: "a@b.com" },
      }),
    ];
    expect(computeProductMetrics(events).signups).toBe(1);
  });

  it("returns null percentage when baseline is zero", () => {
    expect(percentageChange(0, 5)).toBeNull();
  });

  it("computes delta between baseline and impact", () => {
    const baseline = [
      makeEvent({
        type: "posthog.feature.used",
        title: "Feature",
        category: "product_event",
        source: "posthog",
      }),
    ];
    const impact = [
      ...baseline,
      makeEvent({
        type: "posthog.user.signed_up",
        title: "Signup",
        category: "product_event",
        source: "posthog",
      }),
      makeEvent({
        type: "posthog.user.signed_up",
        title: "Signup 2",
        category: "product_event",
        source: "posthog",
      }),
    ];
    const result = computeMetricsWithDelta(baseline, impact);
    expect(result.baseline.product.productEvents).toBe(1);
    expect(result.impact.product.productEvents).toBe(3);
    expect(result.delta.product.productEvents).toBe(2);
  });
});
