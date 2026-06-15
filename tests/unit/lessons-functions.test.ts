import { describe, expect, it } from "vitest";
import {
  impactFindingDedupTag,
  lessonFromImpactFinding,
  scanSecurityLessonsFromArtifacts,
  scanValidationLessonsFromEvents,
} from "../../convex/lib/lessonGeneration";
import {
  docToLesson,
  validateLessonInput,
} from "../../convex/lib/lessonsLib";
import type { ImpactFindingRecord } from "../../convex/lib/impactAnalysesLib";
import type { Doc, Id } from "../../convex/_generated/dataModel";

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

describe("lessons functions", () => {
  it("validates cautious lesson copy", () => {
    expect(() =>
      validateLessonInput({
        title: "Pattern observed",
        summary: "Activity may have shifted during this window.",
      }),
    ).not.toThrow();

    expect(() =>
      validateLessonInput({
        title: "This change caused downtime",
        summary: "Definitely broke production.",
      }),
    ).toThrow(/cautious language/i);
  });

  it("maps doc fields to lesson records", () => {
    const doc = {
      _id: "lesson1" as Id<"lessons">,
      workspaceId: "ws1" as Id<"workspaces">,
      title: "Product pattern observed",
      summary: "Usage may have moved during the window.",
      type: "product_learning",
      status: "active",
      confidence: "possible",
      importance: "normal",
      source: "impact_analysis",
      tags: ["impact-finding:f1"],
      createdAt: 100,
      updatedAt: 200,
    } as Doc<"lessons">;

    const lesson = docToLesson(doc);
    expect(lesson.id).toBe("lesson1");
    expect(lesson.tags).toEqual(["impact-finding:f1"]);
    expect(lesson.updatedAt).toBe(200);
  });

  it("links impact findings with dedup tags and evidence", () => {
    const lesson = lessonFromImpactFinding(
      makeFinding({
        id: "f-123",
        type: "feature_usage",
        summary: "Feature usage may have changed in the impact window.",
        evidenceEventIds: ["evt1"],
      }),
      {
        workspaceId: "ws1" as Id<"workspaces">,
        impactAnalysisId: "ia1" as Id<"impactAnalyses">,
      },
    );

    expect(lesson.tags).toContain(impactFindingDedupTag("f-123"));
    expect(lesson.evidenceImpactAnalysisIds).toEqual(["ia1"]);
    expect(lesson.evidenceEventIds).toEqual(["evt1"]);
  });

  it("returns null when no blocked artifacts exist", async () => {
    const ctx = {
      db: {
        get: async () =>
          ({
            redactionStatus: "none",
            safeForAudit: true,
          }) as unknown as Doc<"artifacts">,
      },
    };

    const result = await scanSecurityLessonsFromArtifacts(
      ctx,
      ["art1" as Id<"artifacts">],
      {
        workspaceId: "ws1" as Id<"workspaces">,
        impactAnalysisId: "ia1" as Id<"impactAnalyses">,
      },
    );
    expect(result).toBeNull();
  });

  it("creates security lessons from blocked artifacts", async () => {
    const ctx = {
      db: {
        get: async () =>
          ({
            redactionStatus: "blocked",
            safeForAudit: false,
          }) as Doc<"artifacts">,
      },
    };

    const result = await scanSecurityLessonsFromArtifacts(
      ctx,
      ["art1" as Id<"artifacts">],
      {
        workspaceId: "ws1" as Id<"workspaces">,
        impactAnalysisId: "ia1" as Id<"impactAnalyses">,
      },
    );
    expect(result?.type).toBe("security_learning");
    expect(result?.tags).toContain("security-evidence");
  });

  it("creates validation lessons from failure event types", async () => {
    const result = await scanValidationLessonsFromEvents(
      ["command.failed", "build.failed"],
      {
        workspaceId: "ws1" as Id<"workspaces">,
        impactAnalysisId: "ia1" as Id<"impactAnalyses">,
        evidenceEventIds: ["e1", "e2"] as Id<"events">[],
      },
    );
    expect(result?.type).toBe("validation");
    expect(result?.tags).toContain("validation-from-evidence");
    expect(result?.evidenceEventIds).toEqual(["e1", "e2"]);
  });
});
