import { describe, expect, it } from "vitest";
import { priorityFromInsightFinding } from "../../convex/lib/recommendationPriority";
import { docToRecommendation } from "../../convex/lib/recommendationLib";
import type { Doc } from "../../convex/_generated/dataModel";

describe("recommendation engine signals", () => {
  it("maps error insights to high priority", () => {
    expect(
      priorityFromInsightFinding({
        id: "f1",
        workspaceId: "ws",
        runId: "r1",
        type: "error",
        severity: "warning",
        title: "Command failure detected",
        summary: "Several commands failed",
        createdAt: Date.now(),
      }),
    ).toBe("high");
  });
});

describe("recommendation record mapping", () => {
  it("maps convex doc to API record", () => {
    const record = docToRecommendation({
      _id: "rec1",
      _creationTime: Date.now(),
      workspaceId: "ws1",
      title: "Investigate payment failures",
      summary: "Multiple failures appeared recently",
      type: "investigate",
      source: "stripe",
      status: "open",
      priority: "high",
      confidence: "likely",
      dedupKey: "event:stripe:payment_failed:project:workspace",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Doc<"recommendations">);

    expect(record.id).toBe("rec1");
    expect(record.dedupKey).toContain("stripe");
    expect(record.status).toBe("open");
  });
});
