import { test, expect } from "@playwright/test";
import { describeE2E, skipForAuditor } from "./helpers/auth";

describeE2E("timeline", () => {
  test("shows filters and search", async ({ page }, testInfo) => {
    skipForAuditor(testInfo);
    await page.goto("/timeline");
    await expect(page.getByRole("heading", { name: /Timeline/i })).toBeVisible();
    await expect(page.getByText(/Primary|Raw/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });
});
