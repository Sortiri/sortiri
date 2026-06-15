import { describe, expect, it } from "vitest";
import {
  dashboardPrimaryNavItems,
  getNavItemsForRole,
  INTELLIGENCE_NAV_HREF,
} from "../../src/config/dashboard-nav";

describe("sidebar navigation", () => {
  it("includes Intelligence in primary nav after Views", () => {
    const labels = dashboardPrimaryNavItems.map((item) => item.label);
    expect(labels).toContain("Intelligence");
    const viewsIndex = labels.indexOf("Views");
    const intelligenceIndex = labels.indexOf("Intelligence");
    const askIndex = labels.indexOf("Ask Sortiri");
    expect(intelligenceIndex).toBe(viewsIndex + 1);
    expect(askIndex).toBe(intelligenceIndex + 1);
  });

  it("does not include top-level Impact, Lessons, Playbooks, or Insights", () => {
    const labels = dashboardPrimaryNavItems.map((item) => item.label);
    const hrefs = dashboardPrimaryNavItems.map((item) => item.href);
    expect(labels).not.toContain("Impact");
    expect(labels).not.toContain("Lessons");
    expect(labels).not.toContain("Playbooks");
    expect(labels).not.toContain("Insights");
    expect(hrefs).not.toContain("/impact");
    expect(hrefs).not.toContain("/lessons");
    expect(hrefs).not.toContain("/playbooks");
    expect(hrefs).not.toContain("/insights");
  });

  it("uses /intelligence as the Intelligence href", () => {
    const intelligence = dashboardPrimaryNavItems.find((item) => item.label === "Intelligence");
    expect(intelligence?.href).toBe(INTELLIGENCE_NAV_HREF);
    expect(intelligence?.icon).toBe("intelligence");
  });

  it("keeps auditor nav limited to Audits", () => {
    const auditorItems = getNavItemsForRole("auditor");
    expect(auditorItems).toHaveLength(1);
    expect(auditorItems[0]?.label).toBe("Audits");
    expect(auditorItems.map((item) => item.label)).not.toContain("Intelligence");
  });
});
