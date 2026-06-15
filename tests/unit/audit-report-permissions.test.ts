import { describe, expect, it } from "vitest";
import { canViewAuditReport } from "../../convex/lib/auditReportAccessLib";
import {
  canManageAuditReports,
  canAccessWorkspaceSurface,
  isAuditorRole,
} from "../../convex/lib/authz";
import { isReportImmutable } from "../../src/types/audit-reports";

describe("audit report permissions", () => {
  it("only owner/admin manage audit reports", () => {
    expect(canManageAuditReports("owner")).toBe(true);
    expect(canManageAuditReports("admin")).toBe(true);
    expect(canManageAuditReports("member")).toBe(false);
    expect(canManageAuditReports("viewer")).toBe(false);
    expect(canManageAuditReports("auditor")).toBe(false);
  });

  it("auditor role is isolated from workspace nav", () => {
    expect(isAuditorRole("auditor")).toBe(true);
    expect(isAuditorRole("member")).toBe(false);
    expect(canAccessWorkspaceSurface("auditor")).toBe(false);
    expect(canAccessWorkspaceSurface("member")).toBe(true);
  });

  it("owner/admin can view reports without explicit grant", () => {
    expect(canViewAuditReport("owner", null)).toBe(true);
    expect(canViewAuditReport("admin", null)).toBe(true);
  });

  it("member/viewer/auditor need active grant", () => {
    const activeGrant = { status: "active" as const };
    expect(canViewAuditReport("member", null)).toBe(false);
    expect(canViewAuditReport("member", activeGrant as never)).toBe(true);
    expect(canViewAuditReport("auditor", activeGrant as never)).toBe(true);
    expect(
      canViewAuditReport("auditor", { status: "revoked" } as never),
    ).toBe(false);
  });

  it("finalized reports are immutable", () => {
    expect(isReportImmutable("draft")).toBe(false);
    expect(isReportImmutable("finalized")).toBe(true);
    expect(isReportImmutable("archived")).toBe(true);
  });
});
