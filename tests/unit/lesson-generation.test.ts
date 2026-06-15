import { describe, expect, it } from "vitest";
import { assertLessonCopy } from "../../convex/lib/lessonCopy";
import {
  impactFindingDedupTag,
  lessonFromImpactFinding,
  lessonFromFailurePattern,
  lessonFromInsightFinding,
} from "../../convex/lib/lessonGeneration";
import type { ImpactFindingRecord } from "../../convex/lib/impactAnalysesLib";
import type { Id } from "../../convex/_generated/dataModel";

function makeFinding(
  overrides: Partial<ImpactFindingRecord> & Pick<ImpactFindingRecord, "type" | "summary">,
): ImpactFindingRecord {
  return {
    id: "finding1",
    workspaceId: "ws1",
    analysisId: "analysis1",
    severity: "info",
    confidence: "possible",
    title: "Test finding",
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("lesson generation", () => {
  const context = {
    workspaceId: "ws1" as Id<"workspaces">,
    impactAnalysisId: "ia1" as Id<"impactAnalyses">,
  };

  it("maps negative_signal findings to negative_pattern lessons", () => {
    const lesson = lessonFromImpactFinding(
      makeFinding({
        type: "negative_signal",
        summary: "Payment failures may have increased in the impact window.",
      }),
      context,
    );
    expect(lesson.type).toBe("negative_pattern");
    expect(lesson.importance).toBe("high");
    expect(lesson.confidence).toBe("possible");
  });

  it("maps revenue_movement findings to revenue_learning lessons", () => {
    const lesson = lessonFromImpactFinding(
      makeFinding({
        type: "revenue_movement",
        summary: "Revenue activity may have shifted during this window.",
      }),
      context,
    );
    expect(lesson.type).toBe("revenue_learning");
  });

  it("uses cautious copy for generated lesson fields", () => {
    const lesson = lessonFromImpactFinding(
      makeFinding({
        type: "product_movement",
        summary: "Product usage may have moved during the impact window.",
      }),
      context,
    );
    expect(assertLessonCopy(lesson.title)).toBe(true);
    expect(assertLessonCopy(lesson.summary)).toBe(true);
    expect(assertLessonCopy(lesson.recommendation!)).toBe(true);
  });

  it("adds impact-finding dedup tags", () => {
    const findingId = "finding-abc";
    const lesson = lessonFromImpactFinding(
      makeFinding({
        id: findingId,
        type: "risk",
        summary: "A risk signal may correlate with recent activity.",
        severity: "critical",
      }),
      context,
    );
    expect(impactFindingDedupTag(findingId)).toBe("impact-finding:finding-abc");
    expect(lesson.tags).toContain("impact-finding:finding-abc");
  });

  it("builds failure pattern lessons with dedup tags", () => {
    const lesson = lessonFromFailurePattern({
      workspaceId: "ws1" as Id<"workspaces">,
      failureType: "command.failed",
      count: 4,
      windowDays: 7,
    });
    expect(lesson.type).toBe("validation");
    expect(lesson.tags).toContain("failure-pattern:command.failed");
    expect(assertLessonCopy(lesson.summary)).toBe(true);
  });

  it("builds insight-sourced lessons with insight-finding tags", () => {
    const lesson = lessonFromInsightFinding({
      workspaceId: "ws1" as Id<"workspaces">,
      insightFindingId: "if1" as Id<"insightFindings">,
      title: "Repeated command failures",
      summary: "Several command failures appeared recently and may indicate a validation gap.",
      recommendation: "Run validation scripts before retrying similar work.",
    });
    expect(lesson.source).toBe("insight");
    expect(lesson.tags).toContain("insight-finding:if1");
  });
});
