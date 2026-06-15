import { describe, expect, it } from "vitest";
import { suggestPlaybooksForGoal } from "../../convex/lib/playbooksLib";
import type { PlaybookRecord } from "../../convex/lib/playbooksLib";

function makePlaybook(title: string, trigger?: string): PlaybookRecord {
  return {
    id: `pb-${title}`,
    workspaceId: "ws1",
    title,
    summary: title,
    type: "engineering",
    status: "active",
    trigger,
    steps: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe("context playbook matching", () => {
  it("ranks playbooks by goal token overlap", () => {
    const playbooks = [
      makePlaybook("Deploy checklist", "deploy release"),
      makePlaybook("Stripe checkout validation", "stripe checkout webhook"),
    ];
    const [top] = suggestPlaybooksForGoal(playbooks, "Fix stripe checkout webhook");
    expect(top?.title).toContain("Stripe");
  });
});
