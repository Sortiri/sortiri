import { describe, expect, it } from "vitest";
import { docToDecision } from "../../convex/lib/decisionsLib";

describe("decision linking mappers", () => {
  it("maps linked ids from decision docs", () => {
    const record = docToDecision({
      _id: "dec1",
      _creationTime: 1,
      workspaceId: "ws1",
      title: "Ship Slack on Convex",
      status: "confirmed",
      decisionType: "engineering",
      source: "manual",
      decidedAt: 100,
      createdAt: 100,
      updatedAt: 100,
      linkedEventIds: ["ev1"],
      linkedWorkstreamIds: ["w1"],
      linkedEntityIds: ["e1"],
    } as never);

    expect(record.linkedEventIds).toEqual(["ev1"]);
    expect(record.linkedWorkstreamIds).toEqual(["w1"]);
    expect(record.linkedEntityIds).toEqual(["e1"]);
  });
});
