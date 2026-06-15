import { test, expect } from "@playwright/test";
import { describeE2E, skipForAuditor } from "./helpers/auth";

describeE2E("entities", () => {
  test("shows entity filters", async ({ page }, testInfo) => {
    skipForAuditor(testInfo);
    await page.goto("/entities");
    await expect(page.getByRole("heading", { name: /Entities/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /All|Files|Customers/i }).first()).toBeVisible();
  });
});
