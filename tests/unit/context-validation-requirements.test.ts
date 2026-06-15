import { describe, expect, it } from "vitest";
import { generateValidationRequirements } from "../../convex/lib/validationRequirements";

describe("context validation requirements", () => {
  it("adds frontend validation for UI goals", () => {
    const reqs = generateValidationRequirements({
      goal: "Update onboarding UI component",
      files: ["src/components/onboarding/page.tsx"],
    });
    expect(reqs.some((req) => req.command === "npm run typecheck")).toBe(true);
    expect(reqs.some((req) => req.command === "npm run test:e2e")).toBe(true);
  });

  it("adds Stripe validation for payment goals", () => {
    const reqs = generateValidationRequirements({
      goal: "Fix Stripe checkout webhook",
    });
    expect(reqs.some((req) => req.title.includes("Stripe"))).toBe(true);
  });

  it("adds PostHog validation for analytics goals", () => {
    const reqs = generateValidationRequirements({
      goal: "Verify PostHog activation events",
    });
    expect(reqs.some((req) => req.command?.includes("posthog"))).toBe(true);
  });

  it("adds audit validation for audit goals", () => {
    const reqs = generateValidationRequirements({
      goal: "Prepare audit report evidence",
    });
    expect(reqs.some((req) => req.title.toLowerCase().includes("audit"))).toBe(true);
  });
});
