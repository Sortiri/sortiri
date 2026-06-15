import { describe, expect, it } from "vitest";
import { mapPostHogWebhook } from "../../src/lib/integrations/posthog/mapPostHogWebhook";
import type { PostHogNormalizedEvent } from "../../src/lib/integrations/posthog/normalizePayload";

function normalized(overrides: Partial<PostHogNormalizedEvent> & Pick<PostHogNormalizedEvent, "event">) {
  return {
    deliveryId: "posthog:test-1",
    ...overrides,
  };
}

describe("mapPostHogWebhook", () => {
  it("maps generic events to posthog.* product_event", () => {
    const mapped = mapPostHogWebhook(
      normalized({
        event: "custom analytics event",
        distinctId: "user_1",
      }),
    );
    expect(mapped.source).toBe("posthog");
    expect(mapped.category).toBe("product_event");
    expect(mapped.type).toBe("posthog.custom_analytics_event");
    expect(mapped.actor.type).toBe("human");
  });

  it("maps signup variants to posthog.user.signed_up", () => {
    const mapped = mapPostHogWebhook(
      normalized({
        event: "user signed up",
        distinctId: "user_signup",
        properties: { $email: "signup@example.com" },
      }),
    );
    expect(mapped.type).toBe("posthog.user.signed_up");
    expect(mapped.importance).toBe("high");
    expect(mapped.entity?.type).toBe("user");
  });

  it("maps activation variants to posthog.activation.completed", () => {
    const mapped = mapPostHogWebhook(
      normalized({
        event: "onboarding completed",
        distinctId: "user_activation",
      }),
    );
    expect(mapped.type).toBe("posthog.activation.completed");
    expect(mapped.importance).toBe("high");
  });

  it("maps feature usage to posthog.feature.used", () => {
    const mapped = mapPostHogWebhook(
      normalized({
        event: "feature used",
        distinctId: "user_feature",
        properties: { feature: "timeline" },
      }),
    );
    expect(mapped.type).toBe("posthog.feature.used");
    expect(mapped.entity?.type).toBe("feature");
    expect(mapped.category).toBe("product_event");
  });

  it("maps checkout clicks to product_event not revenue_event", () => {
    const mapped = mapPostHogWebhook(
      normalized({
        event: "checkout clicked",
        distinctId: "user_checkout",
        properties: { $pathname: "/pricing" },
      }),
    );
    expect(mapped.type).toBe("posthog.checkout.clicked");
    expect(mapped.category).toBe("product_event");
    expect(mapped.category).not.toBe("revenue_event");
  });
});
