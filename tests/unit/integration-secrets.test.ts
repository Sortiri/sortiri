import { describe, expect, it, beforeAll } from "vitest";
import { encryptSecret, decryptSecret, maskSecret } from "../../src/lib/security/secrets";

describe("integration secrets", () => {
  beforeAll(() => {
    process.env.SORTIRI_SECRET_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("encrypts and decrypts secrets without exposing raw value", () => {
    const raw = "whsec_test_integration_secret";
    const encrypted = encryptSecret(raw);
    expect(encrypted).not.toContain(raw);
    expect(decryptSecret(encrypted)).toBe(raw);
  });

  it("maskSecret only exposes last4 for Stripe", () => {
    expect(maskSecret("whsec_test_abcd1234", "stripe")).toBe("whsec_••••1234");
    expect(maskSecret("whsec_test_abcd1234")).toBe("whsec_••••1234");
  });

  it("maskSecret uses GitHub prefix", () => {
    expect(maskSecret("whsec_sortiri_abcdef1234", "github")).toBe(
      "whsec_sortiri_••••1234",
    );
  });

  it("maskSecret uses PostHog prefix", () => {
    expect(maskSecret("phsec_sortiri_abcdef1234", "posthog")).toBe(
      "phsec_sortiri_••••1234",
    );
  });

  it("revoked secret metadata shape excludes ciphertext", () => {
    const metadata = {
      secretLast4: "1234",
      status: "active" as const,
      maskedSecret: maskSecret("whsec_sortiri_placeholder1234", "github"),
    };
    expect(metadata.maskedSecret).not.toContain("placeholder");
    expect(metadata.maskedSecret).toContain("1234");
  });
});
