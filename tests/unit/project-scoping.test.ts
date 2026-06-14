import { describe, expect, it } from "vitest";
import { listEntitiesByProject } from "../../convex/lib/projectPulse";

describe("project scoping", () => {
  it("returns empty entities when project has no events", async () => {
    const mockCtx = {
      db: {
        query: () => ({
          withIndex: () => ({
            order: () => ({
              take: async () => [],
            }),
          }),
        }),
        get: async () => null,
      },
    };

    const entities = await listEntitiesByProject(
      mockCtx as never,
      "workspace1" as never,
      "project1" as never,
    );
    expect(entities).toHaveLength(0);
  });
});
