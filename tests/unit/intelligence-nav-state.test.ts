import { describe, expect, it } from "vitest";
import {
  INTELLIGENCE_NAV_HREF,
  isDashboardNavItemActive,
  isIntelligenceRoute,
} from "../../src/config/dashboard-nav";

describe("intelligence nav state", () => {
  const intelligenceRoutes = [
    "/intelligence",
    "/insights",
    "/impact",
    "/lessons",
    "/playbooks",
    "/impact/abc123",
    "/lessons/lesson-1",
    "/playbooks/playbook-1",
  ];

  it.each(intelligenceRoutes)("treats %s as an intelligence route", (pathname) => {
    expect(isIntelligenceRoute(pathname)).toBe(true);
    expect(isDashboardNavItemActive(pathname, INTELLIGENCE_NAV_HREF)).toBe(true);
  });

  it("does not treat unrelated routes as intelligence routes", () => {
    expect(isIntelligenceRoute("/timeline")).toBe(false);
    expect(isIntelligenceRoute("/home")).toBe(false);
    expect(isDashboardNavItemActive("/timeline", INTELLIGENCE_NAV_HREF)).toBe(false);
    expect(isDashboardNavItemActive("/timeline", "/timeline")).toBe(true);
  });

  it("keeps non-intelligence nav items inactive on intelligence routes", () => {
    expect(isDashboardNavItemActive("/insights", "/home")).toBe(false);
    expect(isDashboardNavItemActive("/impact", "/ask")).toBe(false);
  });
});
