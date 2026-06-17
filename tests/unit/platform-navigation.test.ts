import { describe, expect, it } from "vitest";
import { dashboardPrimaryNavItems } from "@/config/dashboard-nav";
import { INTELLIGENCE_SUBNAV, SOURCES_SUBNAV } from "@/config/platform-nav";

describe("platform navigation model", () => {
  it("primary sidebar uses simplified developer-platform order", () => {
    expect(dashboardPrimaryNavItems.map((item) => item.label)).toEqual([
      "Home",
      "Projects",
      "Timeline",
      "Workstreams",
      "Intelligence",
      "Sources",
      "Audits",
      "Ask Sortiri",
    ]);
  });

  it("does not include Entities or Views in primary nav", () => {
    const labels = dashboardPrimaryNavItems.map((item) => item.label);
    expect(labels).not.toContain("Entities");
    expect(labels).not.toContain("Views");
  });

  it("intelligence subnav includes impact and private evals", () => {
    const labels = INTELLIGENCE_SUBNAV.map((item) => item.label);
    expect(labels).toContain("Impact");
    expect(labels).toContain("Private Evals");
    expect(labels).toContain("Remediation");
  });

  it("sources subnav includes reliability and dead letters", () => {
    const labels = SOURCES_SUBNAV.map((item) => item.label);
    expect(labels).toContain("Reliability");
    expect(labels).toContain("Dead Letters");
    expect(labels).toContain("API Keys");
  });
});
