/**
 * Local Stripe webhook tester — POST signed payloads without Stripe CLI.
 *
 * Usage:
 *   WORKSPACE_ID=<uuid> WEBHOOK_SECRET=whsec_... npx tsx scripts/test-stripe-webhook.ts
 *
 * Optional:
 *   API_URL=http://localhost:3000
 *   EVENT_TYPE=payment_intent.succeeded
 */

import { buildStripeSignatureHeader } from "../src/lib/integrations/stripe/verifySignature";

const EVENT_TYPES = [
  "checkout.session.completed",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "invoice.paid",
  "customer.subscription.deleted",
  "charge.refunded",
] as const;

type StripeEventType = (typeof EVENT_TYPES)[number];

function buildPayload(eventType: StripeEventType, eventId: string) {
  const base = {
    id: eventId,
    object: "event",
    type: eventType,
    livemode: false,
    created: Math.floor(Date.now() / 1000),
  };

  switch (eventType) {
    case "checkout.session.completed":
      return {
        ...base,
        data: {
          object: {
            id: "cs_test_sortiri",
            object: "checkout.session",
            amount_total: 4900,
            currency: "usd",
            customer: "cus_test_sortiri",
            customer_email: "test@sortiri.dev",
            mode: "subscription",
            payment_intent: "pi_test_sortiri",
            payment_status: "paid",
            subscription: "sub_test_sortiri",
          },
        },
      };
    case "payment_intent.succeeded":
      return {
        ...base,
        data: {
          object: {
            id: "pi_test_sortiri",
            object: "payment_intent",
            amount: 9900,
            currency: "usd",
            customer: "cus_test_sortiri",
            receipt_email: "test@sortiri.dev",
            latest_charge: "ch_test_sortiri",
          },
        },
      };
    case "payment_intent.payment_failed":
      return {
        ...base,
        data: {
          object: {
            id: "pi_failed_sortiri",
            object: "payment_intent",
            amount: 2500,
            currency: "usd",
            customer: "cus_test_sortiri",
            last_payment_error: { message: "Your card was declined." },
          },
        },
      };
    case "invoice.paid":
      return {
        ...base,
        data: {
          object: {
            id: "in_test_sortiri",
            object: "invoice",
            amount_paid: 4900,
            currency: "usd",
            customer: "cus_test_sortiri",
            customer_email: "test@sortiri.dev",
            subscription: "sub_test_sortiri",
            billing_reason: "subscription_cycle",
            hosted_invoice_url: "https://invoice.stripe.com/test",
          },
        },
      };
    case "customer.subscription.deleted":
      return {
        ...base,
        data: {
          object: {
            id: "sub_test_sortiri",
            object: "subscription",
            customer: "cus_test_sortiri",
            status: "canceled",
          },
        },
      };
    case "charge.refunded":
      return {
        ...base,
        data: {
          object: {
            id: "ch_test_sortiri",
            object: "charge",
            amount_refunded: 9900,
            currency: "usd",
            customer: "cus_test_sortiri",
            payment_intent: "pi_test_sortiri",
            receipt_email: "test@sortiri.dev",
            refunded: true,
          },
        },
      };
    default:
      throw new Error(`Unsupported event type: ${eventType}`);
  }
}

async function postEvent(
  apiUrl: string,
  workspaceId: string,
  webhookSecret: string,
  eventType: StripeEventType,
) {
  const eventId = `evt_test_${eventType.replace(/\./g, "_")}_${Date.now()}`;
  const payload = buildPayload(eventType, eventId);
  const rawBody = JSON.stringify(payload);
  const signature = buildStripeSignatureHeader(rawBody, webhookSecret);

  const response = await fetch(
    `${apiUrl}/api/integrations/stripe/webhook?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": signature,
      },
      body: rawBody,
    },
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${eventType} failed (${response.status}): ${body}`);
  }

  console.log(`[PASS] ${eventType} → ${body}`);
}

async function main() {
  const apiUrl = process.env.API_URL ?? "http://localhost:3000";
  const workspaceId = process.env.WORKSPACE_ID;
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const singleEventType = process.env.EVENT_TYPE as StripeEventType | undefined;

  if (!workspaceId) {
    throw new Error("Set WORKSPACE_ID to your workspace external ID");
  }
  if (!webhookSecret) {
    throw new Error("Set WEBHOOK_SECRET to your active Stripe webhook secret");
  }

  const types = singleEventType ? [singleEventType] : [...EVENT_TYPES];
  for (const eventType of types) {
    await postEvent(apiUrl, workspaceId, webhookSecret, eventType);
  }

  console.log(`\nAll ${types.length} Stripe webhook test(s) passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
