import { describe, expect, it } from "vitest";
import { applyEventSafety } from "../../convex/lib/sensitiveContent";
import { mapPostHogWebhook } from "../../src/lib/integrations/posthog/mapPostHogWebhook";
import { normalizePostHogPayload } from "../../src/lib/integrations/posthog/normalizePayload";

describe("posthog safety", () => {
  it("does not store raw unsafe payload fields", () => {
    const [normalized] = normalizePostHogPayload({
      event: "user signed up",
      distinct_id: "user_1",
      uuid: "evt_safe_1",
      properties: {
        $email: "user@example.com",
        password: "super-secret",
        phone: "555-1234",
        billing_address: "123 Main St",
      },
    });
    const mapped = mapPostHogWebhook(normalized);
    const data = mapped.data ?? {};
    expect(data).not.toHaveProperty("password");
    expect(data).not.toHaveProperty("phone");
    expect(data).not.toHaveProperty("billing_address");
    expect(JSON.stringify(data)).not.toContain("123 Main St");
  });

  it("keeps mapped event safe for audit by default", () => {
    const mapped = mapPostHogWebhook({
      event: "feature used",
      distinctId: "user_2",
      deliveryId: "posthog:audit-safe",
      properties: { feature: "timeline", $email: "user@example.com" },
    });
    const safety = applyEventSafety({
      title: mapped.title,
      summary: mapped.summary,
      entity: mapped.entity,
      actor: mapped.actor,
      data: mapped.data,
    });
    expect(safety.safeForAudit).toBe(true);
  });
});
