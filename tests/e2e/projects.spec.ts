import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("projects", () => {
  test("loads projects page", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: /Projects/i })).toBeVisible();
  });
});
