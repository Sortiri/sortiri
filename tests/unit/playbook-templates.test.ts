import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYBOOK_TEMPLATES,
  getDefaultPlaybookTemplates,
} from "../../convex/lib/playbookTemplates";
import { assertLessonCopy } from "../../convex/lib/lessonCopy";

describe("playbook templates", () => {
  it("exposes five default templates", () => {
    const templates = getDefaultPlaybookTemplates();
    expect(templates).toHaveLength(5);
    expect(DEFAULT_PLAYBOOK_TEMPLATES).toHaveLength(5);
  });

  it("includes expected template titles", () => {
    const titles = getDefaultPlaybookTemplates().map((template) => template.title);
    expect(titles).toEqual([
      "Checkout & Stripe Changes",
      "Onboarding & Activation",
      "Integration & Webhook Work",
      "Audit & Evidence Export",
      "Permissions & Access Changes",
    ]);
  });

  it("uses cautious copy in template summaries", () => {
    for (const template of getDefaultPlaybookTemplates()) {
      expect(assertLessonCopy(template.title)).toBe(true);
      expect(assertLessonCopy(template.summary)).toBe(true);
      expect(template.steps.length).toBeGreaterThan(0);
      expect(template.validationRequirements.length).toBeGreaterThan(0);
      expect(template.tags.length).toBeGreaterThan(0);
    }
  });
});
