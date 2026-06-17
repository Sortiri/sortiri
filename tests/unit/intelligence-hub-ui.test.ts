import { describe, expect, it } from "vitest";
import { mapIntentSections } from "@/components/intelligence/intelligence-intent-sections";
import type { IntelligenceHubResult } from "../../convex/intelligenceHub";

const emptyHub: IntelligenceHubResult = {
  isEmpty: false,
  summaries: [],
  recentActivity: [],
  queueSummary: { openCount: 0, criticalHighCount: 0 },
  evalSummary: { activeCount: 0 },
  remediationSummary: {
    openCount: 0,
    failedEvalsNeedingAction: 0,
    rerunsPassed: 0,
    rerunsStillFailing: 0,
  },
  recentRecommendations: [],
  recentEvalSuites: [],
  recentContextPacks: [],
};

describe("intelligence hub ui", () => {
  it("renders six intent cards", () => {
    const sections = mapIntentSections(emptyHub);
    expect(sections).toHaveLength(6);
    expect(sections.map((s) => s.title)).toContain("What changed");
    expect(sections.map((s) => s.title)).toContain("Repeat success");
  });
});
