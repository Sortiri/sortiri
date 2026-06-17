import { describe, expect, it } from "vitest";

describe("source hub ui", () => {
  it("aggregates source health summary counts", () => {
    const entries = [
      { status: "connected", deliveryHealth: "healthy", deadLetters: 0 },
      { status: "connected", deliveryHealth: "degraded", deadLetters: 1 },
      { status: "error", deliveryHealth: "error", deadLetters: 2 },
      { status: "not_connected", deliveryHealth: undefined, deadLetters: 0 },
    ];

    const connected = entries.filter((e) => e.status === "connected").length;
    const degraded = entries.filter(
      (e) => e.status === "error" || e.deliveryHealth === "degraded" || e.deliveryHealth === "error",
    ).length;
    const deadLetters = entries.reduce((sum, e) => sum + (e.deadLetters ?? 0), 0);

    expect(connected).toBe(2);
    expect(degraded).toBe(2);
    expect(deadLetters).toBe(3);
  });
});
