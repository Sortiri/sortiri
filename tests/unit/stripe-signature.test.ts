import { describe, expect, it } from "vitest";
import {
  buildStripeSignatureHeader,
  verifyStripeSignature,
} from "../../src/lib/integrations/stripe/verifySignature";

describe("verifyStripeSignature", () => {
  const secret = "whsec_test_secret_value";
  const body = JSON.stringify({ id: "evt_123", type: "payment_intent.succeeded" });

  it("accepts valid Stripe-Signature header", () => {
    const header = buildStripeSignatureHeader(body, secret);
    expect(verifyStripeSignature(body, header, secret)).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifyStripeSignature(body, "t=1,v1=deadbeef", secret)).toBe(false);
  });

  it("rejects missing signature header", () => {
    expect(verifyStripeSignature(body, null, secret)).toBe(false);
  });

  it("rejects stale timestamp", () => {
    const staleTimestamp = Math.floor(Date.now() / 1000) - 10_000;
    const header = buildStripeSignatureHeader(body, secret, staleTimestamp);
    expect(verifyStripeSignature(body, header, secret, 300)).toBe(false);
  });
});
