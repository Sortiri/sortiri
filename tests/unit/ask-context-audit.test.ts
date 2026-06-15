import { describe, expect, it } from "vitest";
import { formatAskContext } from "../../convex/lib/askContext";

describe("ask context audit boundary", () => {
  it("includes audit report clause when scoped", () => {
    const text = formatAskContext({
      events: [],
      workstreams: [],
      auditReportTitle: "SOC2 Q1",
    });

    expect(text).toContain("AUDIT REPORT CONTEXT");
    expect(text).toContain("Report: SOC2 Q1");
    expect(text).toContain("Answer ONLY using evidence included in this audit report snapshot");
    expect(text).toContain("external auditor session");
  });

  it("uses standard permission note without audit scope", () => {
    const text = formatAskContext({
      events: [],
      workstreams: [],
    });

    expect(text).not.toContain("AUDIT REPORT CONTEXT");
    expect(text).toContain("scoped access");
  });
});
