import { describe, expect, it, beforeAll } from "vitest";
import { encryptSecret, decryptSecret, maskSecret } from "../../src/lib/security/secrets";
import {
  MIN_POSTHOG_SECRET_LENGTH,
  POSTHOG_WEBHOOK_SECRET_PREFIX,
} from "../../src/types/posthog-integration";
import { generatePostHogWebhookSecret } from "../../convex/lib/posthogSecretsLib";
import { normalizePostHogPayload } from "../../src/lib/integrations/posthog/normalizePayload";

describe("posthog webhook functions", () => {
  beforeAll(() => {
    process.env.SORTIRI_SECRET_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("generates secrets with required prefix and length", () => {
    const secret = generatePostHogWebhookSecret();
    expect(secret.startsWith(POSTHOG_WEBHOOK_SECRET_PREFIX)).toBe(true);
    expect(secret.length).toBeGreaterThanOrEqual(MIN_POSTHOG_SECRET_LENGTH);
  });

  it("encrypts and decrypts secrets without exposing raw value", () => {
    const raw = generatePostHogWebhookSecret();
    const encrypted = encryptSecret(raw);
    expect(encrypted).not.toContain(raw);
    expect(decryptSecret(encrypted)).toBe(raw);
  });

  it("masks PostHog secrets for display", () => {
    expect(maskSecret("phsec_sortiri_abcdef1234", "posthog")).toBe(
      "phsec_sortiri_••••1234",
    );
  });

  it("normalizes batch and single PostHog payloads with stable delivery ids", () => {
    const single = normalizePostHogPayload({
      event: "user signed up",
      uuid: "uuid-1",
      distinct_id: "user_1",
    });
    expect(single).toHaveLength(1);
    expect(single[0]!.deliveryId).toBe("uuid-1");

    const batch = normalizePostHogPayload({
      events: [
        { event: "feature used", event_id: "evt_batch_1", distinct_id: "user_2" },
      ],
    });
    expect(batch[0]!.deliveryId).toBe("evt_batch_1");
  });
});
