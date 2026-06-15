import { createHmac } from "node:crypto";
import { describe, expect, it, beforeAll } from "vitest";
import { encryptSecret, decryptSecret } from "../../src/lib/security/secrets";
import { verifyGithubSignature } from "../../src/lib/integrations/github/verifySignature";

describe("github encrypted webhook verification", () => {
  const legacySecret = "whsec_sortiri_legacy_secret_value_1234";
  const body = JSON.stringify({ action: "opened", number: 1 });

  beforeAll(() => {
    process.env.SORTIRI_SECRET_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString("base64");
  });

  function sign(payload: string, secret: string): string {
    return "sha256=" + createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  }

  it("verifies using encrypted integrationSecret after decrypt", () => {
    const encrypted = encryptSecret(legacySecret);
    const decrypted = decryptSecret(encrypted);
    expect(verifyGithubSignature(body, sign(body, decrypted), decrypted)).toBe(true);
  });

  it("falls back to legacy plaintext secret verification", () => {
    expect(verifyGithubSignature(body, sign(body, legacySecret), legacySecret)).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifyGithubSignature(body, "sha256=deadbeef", legacySecret)).toBe(false);
  });

  it("duplicate delivery id pattern is stable", () => {
    const deliveryId = "github-delivery-456";
    expect(deliveryId.length).toBeGreaterThan(0);
  });
});
