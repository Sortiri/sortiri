import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("sources", () => {
  test("shows api keys and github sections", async ({ page }) => {
    await page.goto("/sources");
    await expect(page.getByRole("heading", { name: "Sources", exact: true })).toBeVisible();
    await expect(page.getByText(/API key|Workspace API key/i).first()).toBeVisible();
    await expect(page.getByText(/GitHub/i).first()).toBeVisible();
    await expect(page.getByText(/Install Sortiri CLI|setup token/i).first()).toBeVisible();
  });
});
