import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import {
  buildRemediationDraft,
  findOpenRemediationForResult,
} from "../../convex/lib/evalRemediation";

describe("eval remediation draft", () => {
  it("avoids duplicate open remediation recommendations", async () => {
    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            first: async () => ({
              _id: "rec1",
              status: "open",
              dedupKey: "eval-remediation:result1",
            }),
          }),
        }),
        get: async () => null,
      },
    };

    const existing = await findOpenRemediationForResult(
      ctx as never,
      "ws1" as Id<"workspaces">,
      "result1" as Id<"evalResults">,
    );
    expect(existing?._id).toBe("rec1");
  });

  it("returns null draft when duplicate exists", async () => {
    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            first: async () => ({ _id: "rec1", status: "open" }),
          }),
        }),
        get: async (id: string) => {
          if (id === "playbook1") {
            return { _id: "playbook1", status: "active", title: "PB", trigger: "", tags: [] };
          }
          return null;
        },
      },
    };

    const draft = await buildRemediationDraft(ctx as never, {
      run: {
        _id: "run1" as Id<"evalRuns">,
        workspaceId: "ws1" as Id<"workspaces">,
        evalSuiteId: "suite1" as Id<"evalSuites">,
        status: "failed",
        createdAt: 1,
        updatedAt: 1,
      } as never,
      suite: {
        _id: "suite1" as Id<"evalSuites">,
        title: "Suite",
        playbookId: "playbook1" as Id<"playbooks">,
      } as never,
      evalCase: {
        type: "command",
        title: "test",
        required: true,
        config: { command: "exit 1" },
      } as never,
      result: {
        _id: "result1" as Id<"evalResults">,
        status: "failed",
        title: "test",
        summary: "failed",
      } as never,
    });

    expect(draft).toBeNull();
  });
});
