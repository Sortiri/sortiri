import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("autonomy queue", () => {
  test("intelligence hub shows autonomy queue section", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/intelligence");
    await expect(page.getByRole("heading", { name: /^Autonomy Queue$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open Queue/i })).toBeVisible();
  });

  test("owner can open autonomy queue", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/intelligence/queue");
    await expect(page.getByRole("heading", { name: /^Autonomy Queue$/i })).toBeVisible();
  });

  test("owner can open recommendation detail when one exists", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/intelligence/queue");
    const openLink = page.locator(".recommendation-card a", { hasText: "Open" }).first();
    if ((await openLink.count()) === 0) {
      test.skip();
      return;
    }
    await openLink.click();
    await expect(page.getByRole("link", { name: /Ask about this/i })).toBeVisible();
  });

  test("auditor cannot access autonomy queue", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");

    await page.goto("/intelligence/queue");
    await expect(page).toHaveURL(/\/audits/);
  });
});
