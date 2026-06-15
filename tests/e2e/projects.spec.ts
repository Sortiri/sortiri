import { test, expect } from "@playwright/test";
import { describeE2E, skipForAuditor } from "./helpers/auth";

describeE2E("projects", () => {
  test("loads projects page", async ({ page }, testInfo) => {
    skipForAuditor(testInfo);
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: /Projects/i })).toBeVisible();
  });
});
