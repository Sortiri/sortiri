import { describe, expect, it } from "vitest";
import { applyEventSafety } from "../../convex/lib/sensitiveContent";
import { mapStripeWebhook } from "../../src/lib/integrations/stripe/mapStripeWebhook";

describe("stripe safety", () => {
  it("does not store full raw payload fields", () => {
    const mapped = mapStripeWebhook("payment_intent.succeeded", {
      id: "evt_123",
      type: "payment_intent.succeeded",
      livemode: false,
      created: 1_700_000_000,
      data: {
        object: {
          id: "pi_123",
          amount: 9900,
          currency: "usd",
          customer: "cus_123",
          billing_details: {
            address: { line1: "123 Main St", city: "SF" },
            email: "secret@example.com",
          },
          payment_method: {
            card: { last4: "4242", brand: "visa" },
          },
        },
      },
    });

    expect(mapped).not.toBeNull();
    const data = mapped!.data ?? {};
    expect(data).not.toHaveProperty("billing_details");
    expect(data).not.toHaveProperty("payment_method");
    expect(data).not.toHaveProperty("object");
    expect(JSON.stringify(data)).not.toContain("123 Main St");
  });

  it("keeps mapped event safe for audit by default", () => {
    const mapped = mapStripeWebhook("invoice.paid", {
      id: "evt_456",
      type: "invoice.paid",
      livemode: false,
      created: 1_700_000_000,
      data: {
        object: {
          id: "in_123",
          amount_paid: 4900,
          currency: "usd",
          customer: "cus_123",
          customer_email: "pay@example.com",
        },
      },
    });

    const safety = applyEventSafety({
      title: mapped!.title,
      summary: mapped!.summary,
      entity: mapped!.entity,
      actor: mapped!.actor,
      data: mapped!.data,
    });
    expect(safety.safeForAudit).toBe(true);
  });

  it("redacts sensitive scanner hits in mapped strings", () => {
    const mapped = mapStripeWebhook("payment_intent.payment_failed", {
      id: "evt_789",
      type: "payment_intent.payment_failed",
      livemode: false,
      created: 1_700_000_000,
      data: {
        object: {
          id: "pi_bad",
          amount: 100,
          currency: "usd",
          customer: "cus_123",
          last_payment_error: {
            message: "STRIPE_SECRET_KEY=sk_live_supersecretvalue",
          },
        },
      },
    });

    const safety = applyEventSafety({
      title: mapped!.title,
      summary: mapped!.summary,
      actor: mapped!.actor,
      data: mapped!.data,
    });
    expect(safety.safeForAudit).toBe(false);
    expect(safety.sensitiveFindings?.length).toBeGreaterThan(0);
  });
});
