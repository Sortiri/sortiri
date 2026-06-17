import { describe, expect, it } from "vitest";
import { aggregateDeliveryHealth } from "../../convex/lib/ingestReliabilityLib";
import { deriveExternalStatus } from "../../convex/integrations/health";

describe("source health delivery", () => {
  const sinceMs = Date.now() - 24 * 60 * 60 * 1000;

  it("marks source healthy when deliveries succeed", () => {
    const health = aggregateDeliveryHealth(
      [
        {
          source: "cli",
          status: "convex_written",
          receivedAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      {},
      sinceMs,
    );
    expect(health.cli?.health).toBe("healthy");
    expect(health.cli?.deliveriesLast24h).toBe(1);
  });

  it("marks source degraded when retries are pending", () => {
    const health = aggregateDeliveryHealth(
      [
        {
          source: "cursor",
          status: "retry_pending",
          receivedAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      {},
      sinceMs,
    );
    expect(health.cursor?.health).toBe("degraded");
    expect(health.cursor?.retryPending).toBe(1);
  });

  it("marks source error when open dead letters exist", () => {
    const health = aggregateDeliveryHealth(
      [],
      { github: 2 },
      sinceMs,
    );
    expect(health.github?.health).toBe("error");
    expect(health.github?.deadLetters).toBe(2);
  });

  it("derives external source connected status", () => {
    expect(
      deriveExternalStatus({
        hasActiveSecret: true,
        hasEvents: false,
      }),
    ).toBe("connected");
    expect(
      deriveExternalStatus({
        hasActiveSecret: false,
        hasEvents: false,
        lastError: "webhook failed",
      }),
    ).toBe("error");
  });
});
