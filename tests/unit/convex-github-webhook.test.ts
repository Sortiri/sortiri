import { describe, expect, it } from "vitest";
import {
  verifyGithubSignature,
  verifyStripeSignature,
  verifyPostHogBearer,
} from "../../convex/lib/integrations/webhookVerify";

describe("webhookVerify", () => {
  it("verifies GitHub HMAC signatures", async () => {
    const secret = "whsec_test";
    const body = '{"hello":"world"}';
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const header = `sha256=${hex}`;
    await expect(verifyGithubSignature(body, header, secret)).resolves.toBe(true);
    await expect(verifyGithubSignature(body, "sha256=deadbeef", secret)).resolves.toBe(false);
  });

  it("verifies PostHog bearer tokens", () => {
    expect(verifyPostHogBearer("Bearer secret123", "secret123")).toBe(true);
    expect(verifyPostHogBearer("Bearer wrong", "secret123")).toBe(false);
  });

  it("verifies Stripe signatures with timestamp", async () => {
    const secret = "whsec_stripe";
    const body = "{}";
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${body}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedPayload),
    );
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const header = `t=${timestamp},v1=${hex}`;
    await expect(verifyStripeSignature(body, header, secret)).resolves.toBe(true);
  });
});
