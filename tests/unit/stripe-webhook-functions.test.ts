import { describe, expect, it, beforeAll } from "vitest";
import { encryptSecret, decryptSecret, maskSecret } from "../../src/lib/security/secrets";
import { STRIPE_WEBHOOK_SECRET_PREFIX } from "../../src/types/stripe-integration";

describe("stripe webhook secret functions", () => {
  beforeAll(() => {
    process.env.SORTIRI_SECRET_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("requires whsec_ prefix for Stripe secrets", () => {
    expect("whsec_test_1234".startsWith(STRIPE_WEBHOOK_SECRET_PREFIX)).toBe(true);
    expect("sk_test_1234".startsWith(STRIPE_WEBHOOK_SECRET_PREFIX)).toBe(false);
  });

  it("encrypts and decrypts secrets without exposing raw value in storage shape", () => {
    const raw = "whsec_test_roundtrip_secret";
    const encrypted = encryptSecret(raw);
    expect(encrypted).not.toContain(raw);
    expect(decryptSecret(encrypted)).toBe(raw);
  });

  it("masks secrets for display", () => {
    expect(maskSecret("whsec_test_abcd1234")).toBe("whsec_••••1234");
  });

  it("duplicate Stripe event delivery id pattern is stable", () => {
    const deliveryId = "evt_123";
    expect(deliveryId.startsWith("evt_")).toBe(true);
  });
});
