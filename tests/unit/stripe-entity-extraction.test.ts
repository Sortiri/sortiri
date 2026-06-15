import { describe, expect, it } from "vitest";
import { extractEntitiesFromEvent } from "../../convex/lib/entitiesLib";

describe("stripe entity extraction", () => {
  it("extracts customer/payment/subscription/source entities", () => {
    const entities = extractEntitiesFromEvent({
      source: "stripe",
      category: "revenue_event",
      type: "stripe.invoice.paid",
      actor: {
        type: "customer",
        id: "cus_123",
        name: "pay@example.com",
        email: "pay@example.com",
      },
      entity: {
        type: "subscription",
        id: "sub_123",
        name: "Subscription sub_123",
      },
      data: {
        customerId: "cus_123",
        paymentIntentId: "pi_123",
        subscriptionId: "sub_123",
      },
    });

    const types = entities.map((entity) => `${entity.type}:${entity.key}`);
    expect(types).toContain("customer:cus_123");
    expect(types).toContain("payment:pi_123");
    expect(types).toContain("subscription:sub_123");
    expect(types).toContain("source:stripe");
  });

  it("extracts Stripe source entity", () => {
    const entities = extractEntitiesFromEvent({
      source: "stripe",
      category: "product_event",
      type: "stripe.customer.created",
      actor: { type: "customer", id: "cus_abc", name: "cus_abc" },
      entity: { type: "customer", id: "cus_abc", name: "cus_abc" },
      data: { customerId: "cus_abc" },
    });

    expect(entities.some((entity) => entity.type === "source" && entity.key === "stripe")).toBe(
      true,
    );
  });
});
