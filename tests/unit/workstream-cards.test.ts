import { describe, expect, it } from "vitest";
import { WorkstreamObjectCard } from "@/components/workstreams/workstream-object-card";

describe("workstream cards", () => {
  it("accepts metadata-rich workstream card data", () => {
    expect(WorkstreamObjectCard).toBeTypeOf("function");
    const data = {
      id: "ws1",
      title: "MCP smoke test",
      summary: "Verifying ingest pipeline",
      status: "active" as const,
      projectId: "p1",
      sourceLabel: "Cursor Agent",
      startedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      eventCount: 12,
      artifactCount: 2,
      decisionCount: 1,
      incidentCount: 0,
    };
    expect(data.eventCount).toBe(12);
    expect(data.artifactCount).toBe(2);
  });
});
