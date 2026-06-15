import { describe, expect, it } from "vitest";
import { playbookInputFromTemplate } from "../../convex/lib/playbookGeneration";
import { getDefaultPlaybookTemplates } from "../../convex/lib/playbookTemplates";
import {
  docToPlaybook,
  suggestPlaybooksForGoal,
  unionLessonEvidence,
} from "../../convex/lib/playbooksLib";
import type { LessonRecord } from "../../convex/lib/lessonsLib";
import type { Doc, Id } from "../../convex/_generated/dataModel";

function makeLesson(overrides: Partial<LessonRecord> & Pick<LessonRecord, "title">): LessonRecord {
  return {
    id: "lesson1",
    workspaceId: "ws1",
    summary: "Summary may relate to linked evidence.",
    type: "product_learning",
    status: "active",
    confidence: "possible",
    importance: "normal",
    source: "impact_analysis",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("playbooks functions", () => {
  it("unions evidence ids across lessons", () => {
    const evidence = unionLessonEvidence([
      makeLesson({
        title: "Lesson A",
        evidenceEventIds: ["e1", "e2"],
        evidenceWorkstreamIds: ["ws1"],
        evidenceImpactAnalysisIds: ["ia1"],
      }),
      makeLesson({
        title: "Lesson B",
        evidenceEventIds: ["e2", "e3"],
        impactAnalysisId: "ia2",
      }),
    ]);

    expect(evidence.eventIds.sort()).toEqual(["e1", "e2", "e3"]);
    expect(evidence.workstreamIds).toEqual(["ws1"]);
    expect(evidence.impactAnalysisIds.sort()).toEqual(["ia1", "ia2"]);
  });

  it("suggests playbooks matching goal tokens", () => {
    const playbooks = [
      {
        id: "pb1",
        workspaceId: "ws1",
        title: "Checkout & Stripe Changes",
        summary: "Billing playbook",
        type: "revenue" as const,
        status: "active" as const,
        trigger: "checkout stripe payment",
        steps: [],
        tags: ["stripe"],
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: "pb2",
        workspaceId: "ws1",
        title: "Permissions & Access Changes",
        summary: "Security playbook",
        type: "security" as const,
        status: "active" as const,
        trigger: "permissions role access",
        steps: [],
        tags: ["permissions"],
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    const matches = suggestPlaybooksForGoal(playbooks, "stripe checkout deploy");
    expect(matches.map((pb) => pb.id)).toEqual(["pb1"]);
  });

  it("maps playbook docs to records", () => {
    const doc = {
      _id: "pb1" as Id<"playbooks">,
      workspaceId: "ws1" as Id<"workspaces">,
      title: "Integration & Webhook Work",
      summary: "Use when changing webhooks.",
      type: "integration",
      status: "active",
      trigger: "webhook integration",
      steps: [{ title: "Step 1", order: 1 }],
      validationRequirements: [{ title: "Webhook test" }],
      lessonIds: ["l1" as Id<"lessons">],
      createdAt: 10,
      updatedAt: 20,
    } as Doc<"playbooks">;

    const playbook = docToPlaybook(doc);
    expect(playbook.id).toBe("pb1");
    expect(playbook.steps).toHaveLength(1);
    expect(playbook.lessonIds).toEqual(["l1"]);
  });

  it("builds default playbook inputs without duplicating titles", () => {
    const templates = getDefaultPlaybookTemplates();
    const inputs = templates.map((template) =>
      playbookInputFromTemplate("ws1" as Id<"workspaces">, template),
    );
    const titles = inputs.map((input) => input.title);
    expect(new Set(titles).size).toBe(templates.length);
    expect(inputs.every((input) => input.status === "active")).toBe(true);
  });
});
