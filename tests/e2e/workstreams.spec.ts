import { test, expect } from "@playwright/test";
import { describeE2E, skipForAuditor } from "./helpers/auth";

describeE2E("workstreams", () => {
  test("loads list and status filters", async ({ page }, testInfo) => {
    skipForAuditor(testInfo);
    await page.goto("/workstreams");
    await expect(page.getByRole("heading", { name: /Workstreams/i })).toBeVisible();
    await expect(page.getByText(/Active|Completed|Archived/i).first()).toBeVisible();
  });
});
