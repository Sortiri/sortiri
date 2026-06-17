import { describe, expect, it } from "vitest";
import {
  buildObservabilitySignatureHeader,
  verifyObservabilitySignature,
} from "../../convex/lib/integrations/webhookVerify";

describe("verifyObservabilitySignature", () => {
  const secret = "observability_signing_secret_test";
  const body = JSON.stringify({
    source: "generic",
    signalType: "deploy_failed",
    title: "Deploy failed",
  });

  it("accepts valid observability HMAC signatures", async () => {
    const { timestamp, signature } = await buildObservabilitySignatureHeader(body, secret);
    await expect(
      verifyObservabilitySignature(body, timestamp, signature, secret),
    ).resolves.toBe(true);
  });

  it("rejects invalid signatures", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    await expect(
      verifyObservabilitySignature(body, timestamp, "v0=deadbeef", secret),
    ).resolves.toBe(false);
  });

  it("rejects replay window violations", async () => {
    const staleTimestamp = Math.floor(Date.now() / 1000) - 10_000;
    const { timestamp, signature } = await buildObservabilitySignatureHeader(
      body,
      secret,
      staleTimestamp,
    );
    await expect(
      verifyObservabilitySignature(body, timestamp, signature, secret, 300),
    ).resolves.toBe(false);
  });

  it("accepts slack-compatible header aliases", async () => {
    const { timestamp, signature } = await buildObservabilitySignatureHeader(body, secret);
    await expect(
      verifyObservabilitySignature(body, timestamp, signature, secret),
    ).resolves.toBe(true);
  });
});
