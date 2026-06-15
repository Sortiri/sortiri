import { describe, expect, it } from "vitest";
import { extractEntitiesFromEvent } from "../../convex/lib/entitiesLib";

describe("posthog entity extraction", () => {
  it("extracts user, feature, customer, and source entities", () => {
    const entities = extractEntitiesFromEvent({
      source: "posthog",
      category: "product_event",
      type: "posthog.feature.used",
      actor: {
        type: "human",
        id: "user_posthog_1",
        name: "user@example.com",
        email: "user@example.com",
      },
      entity: {
        type: "feature",
        id: "/timeline",
        name: "/timeline",
      },
      data: {
        distinctId: "user_posthog_1",
        $email: "user@example.com",
        feature: "/timeline",
        customer_id: "cus_posthog_1",
      },
    });

    const types = entities.map((entity) => `${entity.type}:${entity.key}`);
    expect(types).toContain("user:user_posthog_1");
    expect(types).toContain("feature:/timeline");
    expect(types).toContain("customer:cus_posthog_1");
    expect(types).toContain("source:posthog");
  });
});
