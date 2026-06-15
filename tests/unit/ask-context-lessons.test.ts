import { describe, expect, it } from "vitest";
import { assertCautiousCopy } from "../../convex/lib/impactFindings";
import { assertLessonCopy } from "../../convex/lib/lessonCopy";
import { generatePlaybookFromLessons } from "../../convex/lib/playbookGeneration";
import type { LessonRecord } from "../../convex/lib/lessonsLib";
import type { Id } from "../../convex/_generated/dataModel";

function buildLessonContextText(lesson: LessonRecord): string {
  return [
    "LESSON CONTEXT",
    "You are answering from a lesson record. Do not claim causation.",
    "Use cautious language: possibly related, may correlate, not proved.",
    "",
    `Title: ${lesson.title}`,
    `Type: ${lesson.type}`,
    `Confidence: ${lesson.confidence}`,
    `Source: ${lesson.source}`,
    "",
    `Summary: ${lesson.summary}`,
    lesson.recommendation ? `Recommendation: ${lesson.recommendation}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPlaybookContextText(
  playbook: ReturnType<typeof generatePlaybookFromLessons>,
  relatedLessons: LessonRecord[],
): string {
  return [
    "PLAYBOOK CONTEXT",
    "You are answering from a playbook. Do not claim causation.",
    "",
    `Title: ${playbook.title}`,
    `Type: ${playbook.type}`,
    `Trigger: ${playbook.trigger ?? "(none)"}`,
    "",
    playbook.summary,
    "",
    "STEPS",
    ...playbook.steps.map(
      (step, index) =>
        `${step.order ?? index + 1}. ${step.title}${step.description ? `: ${step.description}` : ""}`,
    ),
    "",
    "VALIDATION",
    ...(playbook.validationRequirements ?? []).map(
      (req) =>
        `- ${req.title}${req.command ? ` (${req.command})` : ""}${req.reason ? `: ${req.reason}` : ""}`,
    ),
    "",
    "RELATED LESSONS",
    relatedLessons.length > 0
      ? relatedLessons.map((lesson) => `- ${lesson.title}: ${lesson.summary}`).join("\n")
      : "(none)",
  ].join("\n");
}

describe("ask context lessons", () => {
  it("lesson context text uses cautious language and required headers", () => {
    const lesson: LessonRecord = {
      id: "lesson1",
      workspaceId: "ws1",
      title: "Negative signal noted",
      summary: "Payment failures may have increased during the impact window.",
      type: "negative_pattern",
      status: "active",
      confidence: "possible",
      importance: "high",
      source: "impact_analysis",
      recommendation: "Investigate nearby events and run validation scripts before retrying.",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const contextText = buildLessonContextText(lesson);
    expect(contextText).toContain("LESSON CONTEXT");
    expect(contextText).toContain("Do not claim causation");
    expect(contextText).toContain("Title: Negative signal noted");
    expect(assertLessonCopy(lesson.summary)).toBe(true);
    expect(assertLessonCopy(lesson.recommendation!)).toBe(true);
    expect(contextText.toLowerCase()).not.toMatch(/\bcaused\b|\bdefinitely\b/);
  });

  it("playbook context text includes steps, validation, and related lessons", () => {
    const relatedLessons: LessonRecord[] = [
      {
        id: "l1",
        workspaceId: "ws1",
        title: "Webhook validation lesson",
        summary: "Webhook failures may indicate misconfiguration.",
        type: "validation",
        status: "active",
        confidence: "likely",
        importance: "high",
        source: "failure_pattern",
        recommendation: "Run npx tsx scripts/test-stripe-webhook.ts",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const playbook = generatePlaybookFromLessons({
      workspaceId: "ws1" as Id<"workspaces">,
      lessons: relatedLessons,
      lessonIds: ["l1"] as Id<"lessons">[],
      title: "Stripe deploy playbook",
    });

    const contextText = buildPlaybookContextText(playbook, relatedLessons);
    expect(contextText).toContain("PLAYBOOK CONTEXT");
    expect(contextText).toContain("STEPS");
    expect(contextText).toContain("VALIDATION");
    expect(contextText).toContain("RELATED LESSONS");
    expect(contextText).toContain("Webhook validation lesson");
    expect(assertCautiousCopy(playbook.summary)).toBe(true);
  });
});
