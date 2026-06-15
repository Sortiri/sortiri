import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import { findActiveEvalSuiteByDedupKey } from "../../convex/lib/evalLib";
import { generateFromPlaybookDoc } from "../../convex/lib/evalGeneration";
import { docToPlaybook } from "../../convex/lib/playbooksLib";
import { buildRunSummary } from "../../convex/lib/evalRunnerLib";

describe("eval dedup helpers", () => {
  it("uses stable playbook dedup keys", () => {
    const playbook = docToPlaybook({
      _id: "pb-dedup" as Id<"playbooks">,
      workspaceId: "ws1" as Id<"workspaces">,
      title: "Dedup playbook",
      summary: "Summary",
      type: "integration",
      status: "active",
      trigger: "deploy",
      steps: [{ title: "Step", order: 1 }],
      createdAt: 1,
      updatedAt: 1,
    } as never);

    const draft = generateFromPlaybookDoc(playbook);
    expect(draft.dedupKey).toBe("playbook:pb-dedup");
  });

  it("ignores archived suites when finding active dedup matches", async () => {
    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            first: async () => ({
              _id: "suite1",
              status: "archived",
              dedupKey: "playbook:pb1",
            }),
          }),
        }),
      },
    };

    const result = await findActiveEvalSuiteByDedupKey(
      ctx as never,
      "ws1" as Id<"workspaces">,
      "playbook:pb1",
    );
    expect(result).toBeNull();
  });

  it("returns active suite for dedup key", async () => {
    const activeDoc = {
      _id: "suite1",
      status: "active",
      dedupKey: "playbook:pb1",
    };

    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            first: async () => activeDoc,
          }),
        }),
      },
    };

    const result = await findActiveEvalSuiteByDedupKey(
      ctx as never,
      "ws1" as Id<"workspaces">,
      "playbook:pb1",
    );
    expect(result).toEqual(activeDoc);
  });
});

describe("eval run lifecycle helpers", () => {
  it("builds zero-count summary for empty runs", () => {
    expect(buildRunSummary([])).toBe(
      "0 passed, 0 failed, 0 needs review, 0 skipped, 0 errors",
    );
  });
});
