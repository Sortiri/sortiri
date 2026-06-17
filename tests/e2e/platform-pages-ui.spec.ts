import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("Platform pages UI", () => {
  test("projects page loads with filter bar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Search projects…")).toBeVisible();
  });

  test("timeline filters and hub pills render", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/timeline");
    await expect(page.getByPlaceholder("Search company history…")).toBeVisible();
    await expect(page.getByRole("link", { name: "Decision hub" })).toBeVisible();
  });

  test("workstreams status tabs work", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/workstreams");
    await expect(page.getByRole("tab", { name: /Active/i })).toBeVisible();
    await page.getByRole("tab", { name: /Completed/i }).click();
  });

  test("intelligence subnav works", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/intelligence");
    await expect(page.locator(".platform-subnav")).toBeVisible();
    await expect(page.locator(".intent-sections")).toBeVisible();
  });

  test("sources health summary and cards render", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await expect(page.locator(".sources-health-summary")).toBeVisible();
    await expect(page.getByText("Developer tools", { exact: true })).toBeVisible();
  });

  test("audits page has report actions", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/audits");
    await expect(page.getByRole("heading", { name: "Audits", exact: true })).toBeVisible();
    await expect(page.locator(".pixel-loader, .page-loader").first()).toHaveCount(0, {
      timeout: 60_000,
    }).catch(() => undefined);
    const hasEmptyOrReports =
      (await page.locator(".platform-empty-state").count()) > 0 ||
      (await page.locator(".audit-card").count()) > 0 ||
      (await page.getByText("Evidence requiring review").count()) > 0;
    expect(hasEmptyOrReports).toBeTruthy();
  });

  test("ask page suggestion groups render", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/ask");
    await expect(page.getByText("Replay", { exact: true })).toBeVisible();
    await expect(page.locator(".ask-context-panel")).toBeVisible();
  });

  test("mobile viewport has no horizontal overflow on projects", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/projects");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBeFalsy();
  });

  test("primary nav links do not break", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    const routes = ["/home", "/projects", "/timeline", "/workstreams", "/intelligence", "/sources", "/audits", "/ask"];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("body")).not.toContainText("Application error");
    }
  });
});
