import { describe, expect, it } from "vitest";
import {
  assertNotAuditorWorkspaceBrowse,
  canWriteWorkspaceData,
} from "../../convex/lib/authz";

describe("eval permissions", () => {
  it("blocks viewers from write and run actions", () => {
    expect(canWriteWorkspaceData("viewer")).toBe(false);
  });

  it("blocks auditors from write and run actions", () => {
    expect(canWriteWorkspaceData("auditor")).toBe(false);
  });

  it("allows members to run evals", () => {
    expect(canWriteWorkspaceData("member")).toBe(true);
    expect(canWriteWorkspaceData("admin")).toBe(true);
    expect(canWriteWorkspaceData("owner")).toBe(true);
  });

  it("blocks auditors from browsing workspace eval data", () => {
    expect(() =>
      assertNotAuditorWorkspaceBrowse({ role: "auditor" } as never),
    ).toThrow();
  });

  it("allows members to browse workspace eval data", () => {
    expect(() =>
      assertNotAuditorWorkspaceBrowse({ role: "member" } as never),
    ).not.toThrow();
  });
});
