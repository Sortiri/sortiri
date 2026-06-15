import { describe, expect, it } from "vitest";
import { validateRecommendationInput } from "../../convex/lib/recommendationLib";

describe("recommendation functions", () => {
  it("validates cautious recommendation copy", () => {
    expect(() =>
      validateRecommendationInput({
        title: "Investigate checkout failures",
        summary: "Failures may indicate a recurring validation issue",
      }),
    ).not.toThrow();

    expect(() =>
      validateRecommendationInput({
        title: "This proved the outage",
        summary: "Definitely caused by deploy",
      }),
    ).toThrow();
  });
});
