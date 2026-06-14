import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("views", () => {
  test("loads views page", async ({ page }) => {
    await page.goto("/views");
    await expect(page.getByRole("heading", { name: /^Views$/i })).toBeVisible();
    await expect(page.getByText(/Saved lenses over your company timeline/i)).toBeVisible();
  });

  test("shows create default views affordance for writable users", async ({ page }) => {
    await page.goto("/views");
    const createDefaults = page.getByRole("button", { name: /Create Default Views/i });
    if (await createDefaults.isVisible()) {
      await createDefaults.click();
      await expect(page.getByText(/Engineering|Default Views/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test("view detail and ask link render when a view exists", async ({ page }) => {
    await page.goto("/views");
    const engineeringLink = page.getByRole("link", { name: /Engineering/i }).first();
    if (!(await engineeringLink.isVisible())) {
      const createDefaults = page.getByRole("button", { name: /Create Default Views/i });
      if (await createDefaults.isVisible()) {
        await createDefaults.click();
      }
    }

    const link = page.getByRole("link", { name: /Engineering/i }).first();
    if (await link.isVisible()) {
      await link.click();
      await expect(page.getByRole("heading", { name: /Engineering/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /Ask about this view/i })).toBeVisible();
    }
  });
});
