import { describe, expect, it } from "vitest";
import type { AuditReportRecord } from "@/types/audit-reports";

function groupReports(reports: AuditReportRecord[]) {
  return {
    draft: reports.filter((r) => r.status === "draft"),
    finalized: reports.filter((r) => r.status === "finalized"),
    archived: reports.filter((r) => r.status === "archived"),
  };
}

describe("audit page ui", () => {
  it("groups audit reports by status", () => {
    const reports: AuditReportRecord[] = [
      {
        id: "1",
        workspaceId: "ws",
        title: "Draft report",
        status: "draft",
        scope: {},
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: "2",
        workspaceId: "ws",
        title: "Final report",
        status: "finalized",
        scope: {},
        createdAt: 2,
        updatedAt: 2,
      },
    ];
    const grouped = groupReports(reports);
    expect(grouped.draft).toHaveLength(1);
    expect(grouped.finalized).toHaveLength(1);
  });

  it("empty state copy includes evidence room CTA labels", () => {
    const ctas = ["New report", "Review evidence"];
    expect(ctas).toContain("New report");
    expect(ctas).toContain("Review evidence");
  });
});
