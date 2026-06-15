import { describe, expect, it } from "vitest";
import { mapStripeWebhook } from "../../src/lib/integrations/stripe/mapStripeWebhook";

function stripeEvent(type: string, object: Record<string, unknown>, id = "evt_test_1") {
  return {
    id,
    type,
    livemode: false,
    created: 1_700_000_000,
    data: { object },
  };
}

describe("mapStripeWebhook", () => {
  it("maps checkout.session.completed to revenue_event", () => {
    const mapped = mapStripeWebhook(
      "checkout.session.completed",
      stripeEvent("checkout.session.completed", {
        id: "cs_123",
        amount_total: 4900,
        currency: "usd",
        customer: "cus_123",
        customer_email: "pay@example.com",
        mode: "subscription",
        payment_status: "paid",
        subscription: "sub_123",
        payment_intent: "pi_123",
      }),
    );
    expect(mapped?.category).toBe("revenue_event");
    expect(mapped?.type).toBe("stripe.checkout.session.completed");
    expect(mapped?.importance).toBe("high");
    expect(mapped?.visibility).toBe("primary");
    expect(mapped?.data?.amountTotal).toBe(49);
  });

  it("maps payment_intent.succeeded to revenue_event", () => {
    const mapped = mapStripeWebhook(
      "payment_intent.succeeded",
      stripeEvent("payment_intent.succeeded", {
        id: "pi_123",
        amount: 9900,
        currency: "usd",
        customer: "cus_123",
        latest_charge: "ch_123",
      }),
    );
    expect(mapped?.category).toBe("revenue_event");
    expect(mapped?.type).toBe("stripe.payment_intent.succeeded");
    expect(mapped?.data?.amount).toBe(99);
  });

  it("maps payment_intent.payment_failed to warning/high", () => {
    const mapped = mapStripeWebhook(
      "payment_intent.payment_failed",
      stripeEvent("payment_intent.payment_failed", {
        id: "pi_failed",
        amount: 2500,
        currency: "usd",
        customer: "cus_123",
        last_payment_error: { message: "Card declined" },
      }),
    );
    expect(mapped?.severity).toBe("warning");
    expect(mapped?.importance).toBe("high");
  });

  it("maps invoice.paid with amount/customer/subscription", () => {
    const mapped = mapStripeWebhook(
      "invoice.paid",
      stripeEvent("invoice.paid", {
        id: "in_123",
        amount_paid: 4900,
        currency: "usd",
        customer: "cus_123",
        customer_email: "pay@example.com",
        subscription: "sub_123",
        billing_reason: "subscription_cycle",
        hosted_invoice_url: "https://invoice.stripe.com/i/123",
      }),
    );
    expect(mapped?.data?.invoiceId).toBe("in_123");
    expect(mapped?.data?.customerId).toBe("cus_123");
    expect(mapped?.data?.subscriptionId).toBe("sub_123");
    expect(mapped?.data?.amountPaid).toBe(49);
  });

  it("maps subscription.deleted to cancellation event", () => {
    const mapped = mapStripeWebhook(
      "customer.subscription.deleted",
      stripeEvent("customer.subscription.deleted", {
        id: "sub_123",
        customer: "cus_123",
        status: "canceled",
      }),
    );
    expect(mapped?.type).toBe("stripe.customer.subscription.deleted");
    expect(mapped?.title).toMatch(/canceled/i);
    expect(mapped?.importance).toBe("high");
  });

  it("maps charge.refunded to refund event", () => {
    const mapped = mapStripeWebhook(
      "charge.refunded",
      stripeEvent("charge.refunded", {
        id: "ch_123",
        amount_refunded: 9900,
        currency: "usd",
        customer: "cus_123",
        payment_intent: "pi_123",
        refunded: true,
      }),
    );
    expect(mapped?.type).toBe("stripe.charge.refunded");
    expect(mapped?.importance).toBe("high");
  });

  it("maps customer.created to customer entity product_event", () => {
    const mapped = mapStripeWebhook(
      "customer.created",
      stripeEvent("customer.created", {
        id: "cus_123",
        email: "new@example.com",
      }),
    );
    expect(mapped?.category).toBe("product_event");
    expect(mapped?.entity?.type).toBe("customer");
  });
});
