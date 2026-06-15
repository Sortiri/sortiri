import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("impact analysis", () => {
  test("owner can open impact list page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/impact");
    await expect(page.getByRole("heading", { name: /^Impact$/i })).toBeVisible();
    await expect(
      page.getByText(/Before\/after analysis for workstreams, PRs, decisions, projects, and product changes/i),
    ).toBeVisible();
  });

  test("auditor cannot access impact page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");

    await page.goto("/impact");
    await expect(page).toHaveURL(/\/audits/);
  });
});
