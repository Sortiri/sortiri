import { describe, expect, it } from "vitest";
import { scopeToSavedViewFilters } from "../../convex/lib/auditReportsLib";
import type { AuditReportScope } from "../../src/types/audit-reports";

describe("audit report scope", () => {
  it("maps project scope to saved view filters", () => {
    const scope: AuditReportScope = {
      projectIds: ["p1", "p2"],
      windowStart: 1000,
      windowEnd: 2000,
      visibility: "primary",
      categories: ["code_change"],
      sources: ["github"],
    };

    const filters = scopeToSavedViewFilters(scope as never);
    expect(filters.projectIds).toEqual(["p1", "p2"]);
    expect(filters.visibility).toBe("primary");
    expect(filters.categories).toEqual(["code_change"]);
    expect(filters.sources).toEqual(["github"]);
  });

  it("defaults visibility to primary when omitted", () => {
    const filters = scopeToSavedViewFilters({} as never);
    expect(filters.visibility).toBe("primary");
  });
});
