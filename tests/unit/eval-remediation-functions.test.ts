import { describe, expect, it } from "vitest";
import { updateRemediationStatusAfterRerun } from "../../convex/lib/evalRemediation";

describe("eval remediation functions", () => {
  it("updates remediation status after passed rerun", async () => {
    const patches: Array<{ id: string; remediationStatus: string }> = [];
    const ctx = {
      db: {
        query: () => ({
          collect: async () => [
            {
              _id: "rec1",
              remediationEvalRunId: "run2",
              remediationStatus: "fix_in_progress",
            },
          ],
        }),
        patch: async (id: string, patch: { remediationStatus: string }) => {
          patches.push({ id, remediationStatus: patch.remediationStatus });
        },
      },
    };

    const updated = await updateRemediationStatusAfterRerun(
      ctx as never,
      "run2" as never,
      "passed",
    );
    expect(updated).toEqual(["rec1"]);
    expect(patches[0]?.remediationStatus).toBe("eval_rerun_passed");
  });

  it("updates remediation status after failed rerun", async () => {
    const patches: Array<{ remediationStatus: string }> = [];
    const ctx = {
      db: {
        query: () => ({
          collect: async () => [
            { _id: "rec1", remediationEvalRunId: "run2" },
          ],
        }),
        patch: async (_id: string, patch: { remediationStatus: string }) => {
          patches.push(patch);
        },
      },
    };

    await updateRemediationStatusAfterRerun(ctx as never, "run2" as never, "failed");
    expect(patches[0]?.remediationStatus).toBe("eval_rerun_failed");
  });
});
