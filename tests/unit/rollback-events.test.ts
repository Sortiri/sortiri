import { describe, expect, it } from "vitest";
import { docToRollback } from "../../convex/lib/rollbackEventsLib";

describe("rollback events", () => {
  it("maps rollback docs to records", () => {
    const record = docToRollback({
      _id: "rb1",
      _creationTime: 1,
      workspaceId: "ws1",
      decisionId: "dec1",
      title: "Rollback pricing experiment",
      source: "manual",
      reason: "Conversion dropped",
      rolledBackAt: 200,
      createdAt: 200,
      updatedAt: 200,
    } as never);

    expect(record.decisionId).toBe("dec1");
    expect(record.title).toContain("Rollback");
  });
});
