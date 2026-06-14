import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("team settings", () => {
  test("shows members section", async ({ page }) => {
    await page.goto("/settings/team");
    await expect(page.getByRole("heading", { name: /Team/i })).toBeVisible();
    await expect(page.getByText(/Members/i).first()).toBeVisible();
  });
});
