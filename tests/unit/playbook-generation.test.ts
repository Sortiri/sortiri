import { describe, expect, it } from "vitest";
import { assertLessonCopy } from "../../convex/lib/lessonCopy";
import {
  generatePlaybookFromLessons,
  playbookInputFromTemplate,
} from "../../convex/lib/playbookGeneration";
import { getDefaultPlaybookTemplates } from "../../convex/lib/playbookTemplates";
import type { LessonRecord } from "../../convex/lib/lessonsLib";
import type { Id } from "../../convex/_generated/dataModel";

function makeLesson(overrides: Partial<LessonRecord> & Pick<LessonRecord, "title" | "summary">): LessonRecord {
  return {
    id: "lesson1",
    workspaceId: "ws1",
    type: "validation",
    status: "active",
    confidence: "likely",
    importance: "high",
    source: "failure_pattern",
    recommendation: "Run npx tsx scripts/test-stripe-webhook.ts before deploy.",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("playbook generation", () => {
  it("builds steps from lesson recommendations", () => {
    const lessons = [
      makeLesson({
        title: "Webhook validation lesson",
        summary: "Webhook failures may have recurred recently.",
        type: "validation",
        importance: "high",
      }),
      makeLesson({
        title: "Security lesson",
        summary: "Blocked evidence may need review before export.",
        type: "security_learning",
        importance: "normal",
        recommendation: "Review evidence safety settings before sharing.",
      }),
    ];
    const playbook = generatePlaybookFromLessons({
      workspaceId: "ws1" as Id<"workspaces">,
      lessons,
      lessonIds: ["l1", "l2"] as Id<"lessons">[],
    });

    expect(playbook.steps.length).toBeGreaterThanOrEqual(2);
    expect(playbook.steps.some((s) => s.title === "Webhook validation lesson")).toBe(true);
    expect(playbook.steps.find((s) => s.title === "Webhook validation lesson")?.required).toBe(true);
  });

  it("extracts validation requirements from validation and security lessons", () => {
    const lessons = [
      makeLesson({
        title: "Stripe webhook lesson",
        summary: "Stripe webhook failures may indicate misconfiguration.",
        type: "validation",
        recommendation: "Run npx tsx scripts/test-stripe-webhook.ts",
      }),
    ];
    const playbook = generatePlaybookFromLessons({
      workspaceId: "ws1" as Id<"workspaces">,
      lessons,
      lessonIds: ["l1"] as Id<"lessons">[],
    });

    const stripeValidation = playbook.validationRequirements?.find((req) =>
      req.command?.includes("test-stripe-webhook"),
    );
    expect(stripeValidation).toBeDefined();
    expect(stripeValidation?.required).toBe(true);
  });

  it("falls back to default validation when no validation lessons exist", () => {
    const lessons = [
      makeLesson({
        title: "Product lesson",
        summary: "Product usage may have moved during the window.",
        type: "product_learning",
        importance: "low",
        recommendation: undefined,
      }),
    ];
    const playbook = generatePlaybookFromLessons({
      workspaceId: "ws1" as Id<"workspaces">,
      lessons,
      lessonIds: ["l1"] as Id<"lessons">[],
    });

    expect(playbook.validationRequirements?.some((req) => req.command === "npm run test:unit")).toBe(
      true,
    );
    expect(playbook.steps.some((s) => s.title === "Review linked lessons")).toBe(true);
  });

  it("uses template metadata when provided", () => {
    const template = getDefaultPlaybookTemplates()[0]!;
    const playbook = generatePlaybookFromLessons({
      workspaceId: "ws1" as Id<"workspaces">,
      lessons: [],
      lessonIds: [],
      template,
    });

    expect(playbook.title).toBe(template.title);
    expect(playbook.type).toBe(template.type);
    expect(playbook.steps.length).toBeGreaterThanOrEqual(template.steps.length);
    expect(assertLessonCopy(playbook.summary)).toBe(true);
  });

  it("creates playbook input from template with active status", () => {
    const template = getDefaultPlaybookTemplates()[1]!;
    const input = playbookInputFromTemplate("ws1" as Id<"workspaces">, template);
    expect(input.status).toBe("active");
    expect(input.title).toBe(template.title);
    expect(input.steps).toEqual(template.steps);
  });
});
