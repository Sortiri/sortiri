import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import { applyIncidentLinkCandidates } from "../../convex/lib/incidentLinking";
import { docToIncident } from "../../convex/lib/incidentsLib";

describe("incident linking", () => {
  it("maps linked ids from incident docs", () => {
    const record = docToIncident({
      _id: "inc1",
      _creationTime: 1,
      workspaceId: "ws1",
      title: "API deploy failed",
      status: "open",
      severity: "error",
      source: "observability",
      startedAt: 100,
      createdAt: 100,
      updatedAt: 100,
      linkedSignalIds: ["sig1"],
      linkedEventIds: ["ev1"],
      linkedWorkstreamIds: ["w1"],
      linkedDecisionIds: ["dec1"],
      linkedRollbackIds: ["rb1"],
    } as never);

    expect(record.linkedSignalIds).toEqual(["sig1"]);
    expect(record.linkedEventIds).toEqual(["ev1"]);
    expect(record.linkedWorkstreamIds).toEqual(["w1"]);
    expect(record.linkedDecisionIds).toEqual(["dec1"]);
    expect(record.linkedRollbackIds).toEqual(["rb1"]);
  });

  it("records deploy link metadata without asserting causality", async () => {
    const result = await applyIncidentLinkCandidates(
      { db: {} } as never,
      "inc1" as Id<"incidents">,
      undefined,
      [
        {
          kind: "deploy",
          id: "sig1",
          title: "Deploy failed",
          confidence: "low",
          reason: "Deploy signal may be related based on service overlap.",
        },
      ],
    );

    expect(result.metadata.linkingNote).toContain("heuristic");
    expect(result.metadata.appliedLinks).toEqual([{ kind: "deploy", id: "sig1" }]);
  });
});
