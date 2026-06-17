import { describe, expect, it } from "vitest";
import {
  canViewDecision,
  filterDecisionsByAccess,
} from "../../convex/lib/decisionPermissions";
import type { Id } from "../../convex/_generated/dataModel";

describe("decision permissions", () => {
  const projectA = "proj_a" as Id<"projects">;
  const accessible = new Set<Id<"projects">>([projectA]);

  it("blocks auditors from viewing decisions", () => {
    expect(canViewDecision({ projectId: projectA }, accessible, "auditor")).toBe(false);
  });

  it("allows members on accessible projects", () => {
    expect(canViewDecision({ projectId: projectA }, accessible, "member")).toBe(true);
  });

  it("allows viewers read access", () => {
    expect(canViewDecision({ projectId: projectA }, accessible, "viewer")).toBe(true);
  });

  it("filters decisions by project access", () => {
    const decisions = [
      { projectId: projectA },
      { projectId: "proj_b" as Id<"projects"> },
      { projectId: undefined },
    ];
    const filtered = filterDecisionsByAccess(decisions, accessible, "member");
    expect(filtered).toHaveLength(2);
  });
});
