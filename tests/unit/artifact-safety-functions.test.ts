import { describe, expect, it } from "vitest";
import { canApproveForAudit } from "../../src/types/evidence-safety";

describe("canApproveForAudit", () => {
  it("allows only redacted status", () => {
    expect(canApproveForAudit("redacted")).toBe(true);
    expect(canApproveForAudit("needs_review")).toBe(false);
    expect(canApproveForAudit("blocked")).toBe(false);
    expect(canApproveForAudit("approved")).toBe(false);
    expect(canApproveForAudit("none")).toBe(false);
  });
});
