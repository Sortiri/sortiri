import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import {
  generateFromKnownFailure,
  generateFromLessonDoc,
  generateFromPlaybookDoc,
  generateFromRecommendationDoc,
} from "../../convex/lib/evalGeneration";
import { docToLesson } from "../../convex/lib/lessonsLib";
import { docToPlaybook } from "../../convex/lib/playbooksLib";
import { docToRecommendation } from "../../convex/lib/recommendationLib";

describe("eval generation", () => {
  it("generates playbook step and validation cases", () => {
    const playbook = docToPlaybook({
      _id: "pb1" as Id<"playbooks">,
      workspaceId: "ws1" as Id<"workspaces">,
      title: "Stripe webhook validation playbook",
      summary: "Validate stripe webhook changes before deploy.",
      type: "integration",
      status: "active",
      trigger: "stripe webhook",
      steps: [
        { title: "Run webhook script", order: 1, required: true },
        { title: "Verify checkout flow", order: 2 },
      ],
      validationRequirements: [
        { title: "Typecheck", command: "npm run typecheck", required: true },
      ],
      tags: ["stripe"],
      createdAt: 1,
      updatedAt: 1,
    } as never);

    const draft = generateFromPlaybookDoc(playbook);
    expect(draft.dedupKey).toBe("playbook:pb1");
    expect(draft.source).toBe("playbook");
    expect(draft.cases.some((c) => c.type === "playbook_step_check")).toBe(true);
    expect(draft.cases.some((c) => c.type === "command")).toBe(true);
    expect(draft.cases.some((c) => c.type === "no_secret_leak_check")).toBe(true);
  });

  it("generates stripe webhook cases from lesson tags", () => {
    const lesson = docToLesson({
      _id: "l1" as Id<"lessons">,
      workspaceId: "ws1" as Id<"workspaces">,
      title: "Stripe webhook lesson",
      summary: "Post-deploy stripe webhook failures may need validation.",
      type: "integration_learning",
      status: "active",
      confidence: "possible",
      importance: "normal",
      source: "impact_analysis",
      tags: ["stripe"],
      createdAt: 1,
      updatedAt: 1,
    } as never);

    const draft = generateFromLessonDoc(lesson);
    expect(draft.dedupKey).toBe("lesson:l1");
    expect(draft.cases.some((c) => c.type === "source_webhook_check")).toBe(true);
  });

  it("generates evidence safety case for security lessons", () => {
    const lesson = docToLesson({
      _id: "l2" as Id<"lessons">,
      workspaceId: "ws1" as Id<"workspaces">,
      title: "Audit evidence redaction",
      summary: "Evidence review should avoid leaking secrets.",
      type: "security_learning",
      status: "active",
      confidence: "likely",
      importance: "high",
      source: "system",
      tags: ["audit"],
      createdAt: 1,
      updatedAt: 1,
    } as never);

    const draft = generateFromLessonDoc(lesson);
    expect(draft.cases.some((c) => c.type === "evidence_safety_check")).toBe(true);
  });

  it("generates recommendation API and context quality cases", () => {
    const recommendation = docToRecommendation({
      _id: "rec1" as Id<"recommendations">,
      workspaceId: "ws1" as Id<"workspaces">,
      title: "Investigate checkout failures",
      summary: "Failures may indicate recurring validation issues.",
      type: "validation",
      status: "open",
      priority: "high",
      source: "system",
      generatedContextPackId: "pack1" as Id<"contextPacks">,
      createdAt: 1,
      updatedAt: 1,
    } as never);

    const draft = generateFromRecommendationDoc(recommendation);
    expect(draft.dedupKey).toBe("recommendation:rec1");
    expect(draft.cases.some((c) => c.type === "http_api_check")).toBe(true);
    expect(draft.cases.some((c) => c.type === "context_quality_check")).toBe(true);
  });

  it("generates permission check for known permission failures", () => {
    const draft = generateFromKnownFailure({
      workspaceId: "ws1" as Id<"workspaces">,
      failureType: "permission_denied_viewer",
      title: "Viewer blocked from eval run",
      summary: "Viewers should not queue eval runs.",
      recommendedValidation: "npm run test:unit",
    });

    expect(draft.dedupKey).toContain("known_failure:permission_denied_viewer");
    expect(draft.cases.some((c) => c.type === "permission_check")).toBe(true);
    expect(draft.priority).toBe("high");
  });
});
