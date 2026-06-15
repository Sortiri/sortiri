import { describe, expect, it } from "vitest";
import { canViewArtifact } from "../../convex/lib/authz";
import type { Id } from "../../convex/_generated/dataModel";

describe("artifact permissions", () => {
  const accessible = new Set(["p1" as Id<"projects">]);

  it("allows artifact with accessible projectId", () => {
    expect(
      canViewArtifact({ projectId: "p1" as Id<"projects"> }, accessible),
    ).toBe(true);
  });

  it("blocks artifact with inaccessible projectId", () => {
    expect(
      canViewArtifact({ projectId: "p2" as Id<"projects"> }, accessible),
    ).toBe(false);
  });

  it("uses workstream project when artifact has no projectId", () => {
    expect(
      canViewArtifact(
        { workstreamId: "ws1" as Id<"workstreams"> },
        accessible,
        "p1" as Id<"projects">,
      ),
    ).toBe(true);
    expect(
      canViewArtifact(
        { workstreamId: "ws1" as Id<"workstreams"> },
        accessible,
        "p2" as Id<"projects">,
      ),
    ).toBe(false);
  });
});
