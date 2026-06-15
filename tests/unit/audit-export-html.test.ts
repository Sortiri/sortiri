import { describe, expect, it } from "vitest";
import { exportHtml, AUDIT_HTML_FILENAME } from "@/lib/audits/exportHtml";
import { EXPORT_SAFETY_NOTICE } from "@/types/audit-sharing";
import { createShareableFixture } from "../fixtures/shareable-report";

describe("audit export html", () => {
  it("returns static html with report title", () => {
    const output = exportHtml(createShareableFixture());
    expect(output).toContain("<!DOCTYPE html>");
    expect(output).toContain("Q1 Security Audit");
    expect(output).not.toContain("<script");
  });

  it("includes safe evidence content", () => {
    const output = exportHtml(createShareableFixture());
    expect(output).toContain("Deploy completed");
    expect(output).toContain("INFO service started");
  });

  it("includes safety notice", () => {
    const output = exportHtml(createShareableFixture());
    expect(output).toContain(EXPORT_SAFETY_NOTICE);
  });

  it("uses expected html filename constant", () => {
    expect(AUDIT_HTML_FILENAME).toBe("sortiri-audit-report.html");
  });
});
