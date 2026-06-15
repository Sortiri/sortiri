import { describe, expect, it } from "vitest";
import {
  filePathMatchesEvent,
  matchesGoalText,
  scoreRelevance,
  tokenizeGoal,
} from "../../convex/lib/contextRelevance";

describe("context relevance", () => {
  it("tokenizes goal keywords", () => {
    expect(tokenizeGoal("Fix Stripe checkout webhook")).toEqual([
      "fix",
      "stripe",
      "checkout",
      "webhook",
    ]);
  });

  it("matches goal text by token overlap", () => {
    expect(matchesGoalText("Stripe webhook signature failed", "stripe checkout")).toBe(true);
    expect(matchesGoalText("Unrelated deployment", "stripe checkout")).toBe(false);
  });

  it("matches file paths in event text", () => {
    expect(
      filePathMatchesEvent("src/app/checkout/page.tsx", "Changed src/app/checkout/page.tsx"),
    ).toBe(true);
    expect(filePathMatchesEvent("src/other.ts", "Changed checkout page")).toBe(false);
  });

  it("scores more relevant text higher", () => {
    const goal = "stripe webhook validation";
    const high = scoreRelevance(goal, "Stripe webhook signature failure during checkout");
    const low = scoreRelevance(goal, "Updated README");
    expect(high).toBeGreaterThan(low);
  });
});
