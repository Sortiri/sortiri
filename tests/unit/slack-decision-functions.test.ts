import { describe, expect, it } from "vitest";
import { extractDecisionCandidateFromText } from "../../convex/lib/decisionExtraction";
import { isUrlVerification } from "../../convex/lib/integrations/slackMapWebhook";

describe("slack decision side effects", () => {
  it("handles url verification payloads", () => {
    expect(isUrlVerification({ type: "url_verification", challenge: "abc" })).toBe(true);
  });

  it("extracts candidate from mention text", () => {
    const extracted = extractDecisionCandidateFromText(
      "Decision: capture Slack decisions in Sortiri",
    );
    expect(extracted).not.toBeNull();
    expect(extracted?.tags).toContain("decision");
  });
});
