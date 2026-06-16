import { describe, expect, it } from "vitest";
import { canWriteWorkspaceData } from "../../convex/lib/authz";
import { assertNotAuditorWorkspaceBrowse } from "../../convex/lib/authz";

describe("remediation permissions", () => {
  it("viewer cannot write workspace data", () => {
    expect(canWriteWorkspaceData("viewer")).toBe(false);
  });

  it("member can write workspace data", () => {
    expect(canWriteWorkspaceData("member")).toBe(true);
  });

  it("auditor is blocked from workspace browse", () => {
    expect(() =>
      assertNotAuditorWorkspaceBrowse({ role: "auditor", workspaceId: "ws1" } as never),
    ).toThrow(/Access denied/);
  });

  it("owner can write workspace data", () => {
    expect(canWriteWorkspaceData("owner")).toBe(true);
  });
});
