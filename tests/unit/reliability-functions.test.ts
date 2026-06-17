import { describe, expect, it } from "vitest";
import {
  aggregateDeliveryHealth,
  parseEnvelopeEventPayload,
} from "../../convex/lib/ingestReliabilityLib";
import {
  docToIngestDeliverySummary,
  isSuccessfulDelivery,
} from "../../convex/lib/ingestDeliveryLib";
import type { Doc, Id } from "../../convex/_generated/dataModel";

describe("reliability convex functions", () => {
  it("parses valid envelope event payload", () => {
    const payload = parseEnvelopeEventPayload({
      source: "cli",
      category: "agent_action",
      type: "test",
      actor: { type: "agent", name: "Agent" },
      title: "Hello",
    });
    expect(payload.title).toBe("Hello");
    expect(payload.source).toBe("cli");
  });

  it("rejects invalid envelope payload", () => {
    expect(() => parseEnvelopeEventPayload({ title: "missing fields" })).toThrow(
      "Envelope payload missing required event fields",
    );
  });

  it("aggregates duplicate and successful deliveries", () => {
    const now = Date.now();
    const health = aggregateDeliveryHealth(
      [
        { source: "cli", status: "convex_written", receivedAt: now, updatedAt: now },
        { source: "cli", status: "duplicate", receivedAt: now, updatedAt: now },
      ],
      {},
      now - 86_400_000,
    );
    expect(health.cli?.deliveriesLast24h).toBe(2);
    expect(health.cli?.duplicates).toBe(1);
    expect(isSuccessfulDelivery("duplicate")).toBe(true);
  });

  it("maps delivery doc to summary", () => {
    const doc = {
      _id: "del1" as Id<"ingestDeliveries">,
      workspaceId: "ws1" as Id<"workspaces">,
      envelopeId: "env-1",
      idempotencyKey: "ws1:cli:evt-1",
      source: "cli",
      sourceEventId: "evt-1",
      status: "journaled" as const,
      attempts: 0,
      receivedAt: 1,
      updatedAt: 2,
    } as Doc<"ingestDeliveries">;

    const summary = docToIngestDeliverySummary(doc);
    expect(summary.id).toBe("del1");
    expect(summary.status).toBe("journaled");
  });
});
