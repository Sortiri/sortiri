import { describe, expect, it } from "vitest";
import {
  classifyDecisionType,
  extractDecisionCandidateFromText,
  extractEntitiesFromDecisionText,
  extractRollbackFromText,
  matchesDecisionPattern,
  matchesRollbackPattern,
  redactSlackPreview,
} from "../../convex/lib/decisionExtraction";

describe("decision extraction", () => {
  it("detects decision patterns", () => {
    expect(matchesDecisionPattern("Decision: ship Convex HTTP only")).toBe(true);
    expect(matchesDecisionPattern("random chat")).toBe(false);
  });

  it("extracts decision candidate with classification", () => {
    const result = extractDecisionCandidateFromText(
      "Decision: use Convex for all Slack webhooks",
    );
    expect(result?.title).toContain("Convex");
    expect(result?.decisionType).toBe("engineering");
    expect(result?.confidence).toBe("strong");
  });

  it("detects rollback patterns", () => {
    expect(matchesRollbackPattern("Rollback: revert pricing change")).toBe(true);
    const rollback = extractRollbackFromText("Rollback: revert pricing change");
    expect(rollback?.title).toContain("Revert");
  });

  it("classifies pricing and security decisions", () => {
    expect(classifyDecisionType("We decided on new Stripe pricing")).toBe("pricing");
    expect(classifyDecisionType("Decision: enable OAuth hardening")).toBe("security");
  });

  it("extracts entities from decision text", () => {
    expect(extractEntitiesFromDecisionText("Decision for #42 by @alice")).toEqual([
      "42",
      "alice",
    ]);
  });

  it("redacts secrets from previews", () => {
    const preview = redactSlackPreview("token xoxb-1234567890-secret");
    expect(preview).not.toContain("xoxb-");
  });
});
