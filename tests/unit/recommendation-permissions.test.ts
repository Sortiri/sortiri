import { describe, expect, it } from "vitest";
import { canWriteWorkspaceData } from "../../convex/lib/authz";

describe("recommendation permissions", () => {
  it("blocks viewers from write actions", () => {
    expect(canWriteWorkspaceData("viewer")).toBe(false);
    expect(canWriteWorkspaceData("auditor")).toBe(false);
  });

  it("allows members to convert recommendations", () => {
    expect(canWriteWorkspaceData("member")).toBe(true);
    expect(canWriteWorkspaceData("admin")).toBe(true);
    expect(canWriteWorkspaceData("owner")).toBe(true);
  });
});
