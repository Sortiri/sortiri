import { describe, expect, it } from "vitest";
import { docToDecisionCandidate } from "../../convex/lib/decisionCandidatesLib";
import { buildProjectPulseCounts } from "../../convex/lib/projectPulse";

describe("decision functions", () => {
  it("maps decision candidates", () => {
    const record = docToDecisionCandidate({
      _id: "cand1",
      _creationTime: 1,
      workspaceId: "ws1",
      source: "slack",
      status: "pending",
      confidence: "likely",
      title: "Decision: ship v1",
      sourceRef: { sourceEventId: "Ev1", channelId: "C1" },
      createdAt: 1,
      updatedAt: 1,
    } as never);

    expect(record.status).toBe("pending");
    expect(record.source).toBe("slack");
  });

  it("counts decision category in project pulse", () => {
    const counts = buildProjectPulseCounts(
      [
        { category: "decision" } as never,
        { category: "company_decision" } as never,
      ],
      [],
      { decisions: 2, candidates: 1, incidents: 0, deployFailures: 0, rollbacks: 0 },
    );
    expect(counts.decisions).toBe(2);
    expect(counts.decisionCandidates).toBe(1);
  });
});
