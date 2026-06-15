import { describe, expect, it } from "vitest";
import { assertReportMutable } from "../../convex/lib/auditReportsLib";

describe("audit report functions", () => {
  it("allows edits on draft reports", () => {
    expect(() =>
      assertReportMutable({ status: "draft" } as never),
    ).not.toThrow();
  });

  it("blocks edits on finalized reports", () => {
    expect(() =>
      assertReportMutable({ status: "finalized" } as never),
    ).toThrow(/finalized/i);
  });
});
