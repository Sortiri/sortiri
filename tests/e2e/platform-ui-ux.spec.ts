import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("Platform UI/UX", () => {
  test("home loads with project-first layout", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/home");
    await expect(page.getByRole("heading", { name: "Timeline", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Active Projects" })).toBeVisible();
  });

  test("primary sidebar nav includes Projects before Timeline", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/home");
    const nav = page.locator(".dashboard-sidebar-primary-nav");
    await expect(nav.getByRole("button", { name: "Projects" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Timeline" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Entities" })).toHaveCount(0);
  });

  test("projects list loads", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  });

  test("timeline feed loads with day groups or empty state", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/timeline");
    await expect(page.getByRole("heading", { name: /Timeline/i })).toBeVisible();
    await expect(page.locator(".timeline-page__loading")).toHaveCount(0, { timeout: 60_000 });
    const hasFeed =
      (await page.locator(".timeline-day-group").count()) > 0 ||
      (await page.locator(".platform-empty-state").count()) > 0;
    expect(hasFeed).toBeTruthy();
  });

  test("sources hub shows subnav and groups", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await expect(page.locator(".platform-subnav")).toBeVisible();
    await expect(page.getByText("Code", { exact: true })).toBeVisible();
  });

  test("intelligence hub shows intent sections", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/intelligence");
    await expect(page.locator(".platform-subnav")).toBeVisible();
    await expect(page.locator(".intent-sections")).toBeVisible();
  });

  test("timeline decisions hub loads", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/timeline/decisions");
    await expect(page.getByRole("heading", { name: "Decisions", exact: true })).toBeVisible();
  });

  test("timeline incidents hub loads", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/timeline/incidents");
    await expect(page.getByRole("heading", { name: "Incidents", exact: true })).toBeVisible();
  });

  test("mobile viewport has no horizontal overflow on home", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/home");
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });
});
