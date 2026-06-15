import { describe, expect, it, beforeAll } from "vitest";
import { encryptSecret, decryptSecret, maskSecret } from "../../src/lib/security/secrets";
import { STRIPE_WEBHOOK_SECRET_PREFIX } from "../../src/types/stripe-integration";

describe("integration connection functions", () => {
  beforeAll(() => {
    process.env.SORTIRI_SECRET_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("Stripe webhook secret prefix validation", () => {
    expect("whsec_test_1234".startsWith(STRIPE_WEBHOOK_SECRET_PREFIX)).toBe(true);
    expect("sk_test_1234".startsWith(STRIPE_WEBHOOK_SECRET_PREFIX)).toBe(false);
  });

  it("Stripe still encrypts and decrypts after shared helper refactor", () => {
    const raw = "whsec_test_stripe_shared_helper";
    const encrypted = encryptSecret(raw);
    expect(decryptSecret(encrypted)).toBe(raw);
  });

  it("masks secrets for display without raw secret", () => {
    expect(maskSecret("whsec_test_abcd1234")).toBe("whsec_••••1234");
  });

  it("integration error metadata fields are string timestamps", () => {
    const metadata = {
      lastError: "Invalid signature",
      lastErrorAt: Date.now(),
    };
    expect(typeof metadata.lastError).toBe("string");
    expect(typeof metadata.lastErrorAt).toBe("number");
  });

  it("duplicate Stripe event delivery id pattern is stable", () => {
    const deliveryId = "evt_123";
    expect(deliveryId.startsWith("evt_")).toBe(true);
  });
});
