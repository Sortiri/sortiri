import { describe, expect, it } from "vitest";
import {
  buildSlackSignatureHeader,
  verifySlackSignature,
} from "../../convex/lib/integrations/webhookVerify";

describe("verifySlackSignature", () => {
  const secret = "slack_signing_secret_test";
  const body = JSON.stringify({ type: "event_callback", event_id: "Ev123" });

  it("accepts valid Slack signature", async () => {
    const { timestamp, signature } = await buildSlackSignatureHeader(body, secret);
    await expect(
      verifySlackSignature(body, timestamp, signature, secret),
    ).resolves.toBe(true);
  });

  it("rejects invalid signature", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    await expect(
      verifySlackSignature(body, timestamp, "v0=deadbeef", secret),
    ).resolves.toBe(false);
  });

  it("rejects replay window violations", async () => {
    const staleTimestamp = Math.floor(Date.now() / 1000) - 10_000;
    const { timestamp, signature } = await buildSlackSignatureHeader(
      body,
      secret,
      staleTimestamp,
    );
    await expect(
      verifySlackSignature(body, timestamp, signature, secret, 300),
    ).resolves.toBe(false);
  });
});
