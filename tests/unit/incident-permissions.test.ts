import { describe, expect, it } from "vitest";
import {
  canViewIncident,
  canViewObservabilitySignal,
  filterIncidentsByAccess,
  filterObservabilitySignalsByAccess,
} from "../../convex/lib/incidentPermissions";
import type { Id } from "../../convex/_generated/dataModel";

describe("incident permissions", () => {
  const projectA = "proj_a" as Id<"projects">;
  const accessible = new Set<Id<"projects">>([projectA]);

  it("blocks auditors from viewing incidents", () => {
    expect(canViewIncident({ projectId: projectA }, accessible, "auditor")).toBe(false);
  });

  it("blocks auditors from viewing observability signals", () => {
    expect(canViewObservabilitySignal({ projectId: projectA }, accessible, "auditor")).toBe(
      false,
    );
  });

  it("allows members on accessible projects", () => {
    expect(canViewIncident({ projectId: projectA }, accessible, "member")).toBe(true);
    expect(canViewObservabilitySignal({ projectId: projectA }, accessible, "member")).toBe(true);
  });

  it("allows viewers read access", () => {
    expect(canViewIncident({ projectId: projectA }, accessible, "viewer")).toBe(true);
  });

  it("filters incidents by project access", () => {
    const incidents = [
      { projectId: projectA },
      { projectId: "proj_b" as Id<"projects"> },
      { projectId: undefined },
    ];
    const filtered = filterIncidentsByAccess(incidents, accessible, "member");
    expect(filtered).toHaveLength(2);
  });

  it("filters observability signals by project access", () => {
    const signals = [
      { projectId: projectA },
      { projectId: "proj_b" as Id<"projects"> },
      { projectId: undefined },
    ];
    const filtered = filterObservabilitySignalsByAccess(signals, accessible, "member");
    expect(filtered).toHaveLength(2);
  });
});
