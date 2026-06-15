import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

const CHILD_ROUTES = [
  { path: "/insights", heading: /^Insights$/i },
  { path: "/impact", heading: /^Impact$/i },
  { path: "/lessons", heading: /^Lessons$/i },
  { path: "/playbooks", heading: /^Playbooks$/i },
] as const;

describeE2E("intelligence hub", () => {
  test("sidebar renders Intelligence and not separate intelligence child items", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/home");
    const sidebar = page.locator("aside[aria-label='Main navigation']");
    await expect(sidebar.getByRole("button", { name: "Intelligence" })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Impact", exact: true })).toHaveCount(0);
    await expect(sidebar.getByRole("button", { name: "Lessons", exact: true })).toHaveCount(0);
    await expect(sidebar.getByRole("button", { name: "Playbooks", exact: true })).toHaveCount(0);
    await expect(sidebar.getByRole("button", { name: "Insights", exact: true })).toHaveCount(0);
  });

  test("clicking Intelligence opens the hub", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/home");
    await page.locator("aside[aria-label='Main navigation']").getByRole("button", { name: "Intelligence" }).click();
    await expect(page).toHaveURL(/\/intelligence/);
    await expect(page.getByRole("heading", { name: /^Intelligence$/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Insights" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Impact" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Lessons" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Playbooks" })).toBeVisible();
  });

  for (const { path, heading } of CHILD_ROUTES) {
    test(`existing route ${path} still works and keeps Intelligence active`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "owner", "owner-only");

      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(
        page.locator("aside[aria-label='Main navigation'] .dashboard-sidebar-nav-item.is-active", {
          hasText: "Intelligence",
        }),
      ).toBeVisible();
    });
  }

  test("collapsed sidebar still renders Intelligence icon", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/home");
    await page.evaluate(() => {
      localStorage.setItem("sortiri-sidebar-collapsed", "true");
    });
    await page.reload();
    await expect(page.locator(".dashboard-shell[data-sidebar-collapsed='true']")).toBeVisible();
    await expect(
      page.locator("aside[aria-label='Main navigation']").getByRole("button", { name: "Intelligence" }),
    ).toBeVisible();
  });

  test("auditor cannot access intelligence hub", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");

    await page.goto("/intelligence");
    await expect(page).toHaveURL(/\/audits/);
  });
});
