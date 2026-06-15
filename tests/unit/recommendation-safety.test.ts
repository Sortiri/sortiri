import { describe, expect, it } from "vitest";
import { assertRecommendationCopy } from "../../convex/lib/recommendationCopy";

describe("recommendation safety copy", () => {
  it("rejects causation language in recommendation copy", () => {
    expect(assertRecommendationCopy("This definitely caused the outage")).toBe(false);
    expect(assertRecommendationCopy("Payment failures may need investigation")).toBe(true);
  });
});
