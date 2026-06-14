import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyGithubSignature } from "../../src/lib/integrations/github/verifySignature";

describe("verifyGithubSignature", () => {
  const secret = "test-webhook-secret";
  const body = JSON.stringify({ action: "opened", number: 42 });

  function sign(payload: string): string {
    return (
      "sha256=" + createHmac("sha256", secret).update(payload, "utf8").digest("hex")
    );
  }

  it("accepts valid x-hub-signature-256", () => {
    expect(verifyGithubSignature(body, sign(body), secret)).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifyGithubSignature(body, "sha256=deadbeef", secret)).toBe(false);
  });

  it("rejects missing signature header", () => {
    expect(verifyGithubSignature(body, null, secret)).toBe(false);
  });

  it("rejects malformed signature prefix", () => {
    expect(verifyGithubSignature(body, "sha1=abc", secret)).toBe(false);
  });
});
