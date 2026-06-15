import { describe, expect, it } from "vitest";
import { generateDeterministicFindings } from "../../convex/lib/insightRules";
import type { EventRecord } from "../../convex/lib/eventsLib";
import type { WorkstreamRecord } from "../../convex/lib/workstreamsLib";

function makeEvent(overrides: Partial<EventRecord> & Pick<EventRecord, "type" | "title">): EventRecord {
  return {
    id: crypto.randomUUID() as EventRecord["id"],
    workspaceId: "ws1" as EventRecord["workspaceId"],
    source: "github",
    category: "code_change",
    actor: { type: "human", name: "Dev" },
    occurredAt: Date.now(),
    createdAt: Date.now(),
    ...overrides,
  } as EventRecord;
}

describe("impact analysis integration rules", () => {
  const windowEnd = Date.now();
  const windowStart = windowEnd - 7 * 24 * 60 * 60 * 1000;

  it("emits impact_opportunity for merged PRs", () => {
    const events = [
      makeEvent({
        type: "github.pull_request.merged",
        title: "Merged PR",
      }),
    ];
    const findings = generateDeterministicFindings({
      events,
      workstreams: [],
      windowStart,
      windowEnd,
    });
    const opportunity = findings.find((f) => f.type === "impact_opportunity");
    expect(opportunity).toBeDefined();
    expect(opportunity?.data).toMatchObject({
      anchorType: "event",
    });
  });

  it("includes PostHog and Stripe events in product/revenue movement rules", () => {
    const events = [
      makeEvent({
        type: "posthog.user.signed_up",
        title: "Signup",
        category: "product_event",
        source: "posthog",
      }),
      makeEvent({
        type: "stripe.payment_intent.succeeded",
        title: "Paid",
        category: "revenue_event",
        source: "stripe",
        data: { amount: 100, currency: "usd" },
      }),
    ];
    const findings = generateDeterministicFindings({
      events,
      workstreams: [] as WorkstreamRecord[],
      windowStart,
      windowEnd,
    });
    expect(findings.some((f) => f.title.includes("PostHog"))).toBe(true);
    expect(findings.some((f) => f.title.includes("Revenue movement"))).toBe(true);
  });
});
