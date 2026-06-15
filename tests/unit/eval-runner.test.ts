import { describe, expect, it } from "vitest";
import { buildRunSummary, computeRunStatus } from "../../convex/lib/evalRunnerLib";

describe("computeRunStatus", () => {
  it("returns error when no results", () => {
    expect(computeRunStatus([])).toBe("error");
  });

  it("returns error when any result errored", () => {
    expect(
      computeRunStatus([
        { status: "passed", required: true },
        { status: "error", required: true },
      ]),
    ).toBe("error");
  });

  it("returns failed when a required case failed", () => {
    expect(
      computeRunStatus([
        { status: "passed", required: true },
        { status: "failed", required: true },
      ]),
    ).toBe("failed");
  });

  it("returns needs_review when any case needs review", () => {
    expect(
      computeRunStatus([
        { status: "passed", required: true },
        { status: "needs_review", required: false },
      ]),
    ).toBe("needs_review");
  });

  it("returns needs_review when optional case failed", () => {
    expect(
      computeRunStatus([
        { status: "passed", required: true },
        { status: "failed", required: false },
      ]),
    ).toBe("needs_review");
  });

  it("returns passed when all cases passed or skipped", () => {
    expect(
      computeRunStatus([
        { status: "passed", required: true },
        { status: "skipped", required: false },
      ]),
    ).toBe("passed");
  });
});

describe("buildRunSummary", () => {
  it("aggregates result counts", () => {
    const summary = buildRunSummary([
      {
        id: "r1",
        workspaceId: "ws1",
        evalRunId: "run1",
        evalCaseId: "c1",
        status: "passed",
        title: "Case 1",
        createdAt: 1,
      },
      {
        id: "r2",
        workspaceId: "ws1",
        evalRunId: "run1",
        evalCaseId: "c2",
        status: "failed",
        title: "Case 2",
        createdAt: 1,
      },
      {
        id: "r3",
        workspaceId: "ws1",
        evalRunId: "run1",
        evalCaseId: "c3",
        status: "needs_review",
        title: "Case 3",
        createdAt: 1,
      },
    ]);

    expect(summary).toContain("1 passed");
    expect(summary).toContain("1 failed");
    expect(summary).toContain("1 needs review");
  });
});
