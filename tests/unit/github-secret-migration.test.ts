import { describe, expect, it, beforeAll } from "vitest";
import { encryptSecret, decryptSecret } from "../../src/lib/security/secrets";
import { TEST_GITHUB_WEBHOOK_SECRET } from "../../convex/testSeed";

describe("github secret migration mapping", () => {
  beforeAll(() => {
    process.env.SORTIRI_SECRET_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
  });

  it("preserves last4 when encrypting legacy GitHub secret", () => {
    const last4 = TEST_GITHUB_WEBHOOK_SECRET.slice(-4);
    const encrypted = encryptSecret(TEST_GITHUB_WEBHOOK_SECRET);
    expect(decryptSecret(encrypted)).toBe(TEST_GITHUB_WEBHOOK_SECRET);
    expect(last4).toBe(TEST_GITHUB_WEBHOOK_SECRET.slice(-4));
    expect(encrypted).not.toContain(TEST_GITHUB_WEBHOOK_SECRET);
  });

  it("legacy secret prefix is preserved after decrypt roundtrip", () => {
    const decrypted = decryptSecret(encryptSecret(TEST_GITHUB_WEBHOOK_SECRET));
    expect(decrypted.startsWith("whsec_sortiri_")).toBe(true);
  });
});
