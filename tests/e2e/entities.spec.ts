import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("entities", () => {
  test("shows entity filters", async ({ page }) => {
    await page.goto("/entities");
    await expect(page.getByRole("heading", { name: /Entities/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /All|Files|Customers/i }).first()).toBeVisible();
  });
});
