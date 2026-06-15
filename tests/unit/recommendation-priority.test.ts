import { describe, expect, it } from "vitest";
import {
  priorityFromImpactFinding,
  priorityFromInsightFinding,
  priorityFromKnownFailure,
  priorityFromSourceHealth,
} from "../../convex/lib/recommendationPriority";

describe("recommendation priority", () => {
  it("marks sensitive insight findings as critical", () => {
    expect(
      priorityFromInsightFinding({
        id: "f1",
        workspaceId: "ws",
        runId: "r1",
        type: "sensitive_evidence",
        severity: "warning",
        title: "Sensitive evidence",
        summary: "Blocked artifacts detected",
        createdAt: Date.now(),
      }),
    ).toBe("critical");
  });

  it("marks repeated failures as high", () => {
    expect(
      priorityFromKnownFailure({
        failureType: "command.failed",
        title: "Failures",
        summary: "Many failures",
        lastSeenAt: Date.now(),
        count: 4,
        evidenceEventIds: [],
      }),
    ).toBe("high");
  });

  it("marks stripe source health errors as critical", () => {
    expect(
      priorityFromSourceHealth({
        source: "stripe",
        status: "error",
        eventCount: 1,
        primaryEventCount: 1,
        lastError: "delivery failed",
      }),
    ).toBe("critical");
  });

  it("marks negative impact findings as high", () => {
    expect(
      priorityFromImpactFinding({
        id: "f1",
        analysisId: "a1",
        workspaceId: "ws",
        type: "negative_signal",
        severity: "warning",
        confidence: "likely",
        title: "Negative signal",
        summary: "Errors may have increased",
        createdAt: Date.now(),
      }),
    ).toBe("high");
  });
});
