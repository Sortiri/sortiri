import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("context packs", () => {
  test("owner can open context packs list", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/context");
    await expect(page.getByRole("heading", { name: /^Agent Context$/i })).toBeVisible();
  });

  test("intelligence hub shows agent context section", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/intelligence");
    await expect(page.getByRole("heading", { name: /^Agent Context$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /View Context Packs/i })).toBeVisible();
  });

  test("workstream detail shows agent context panel", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/workstreams");
    const link = page.locator(".workstreams-table a").first();
    if ((await link.count()) === 0) {
      test.skip();
      return;
    }
    await link.click();
    await expect(page.getByRole("heading", { name: /^Agent Context$/i })).toBeVisible();
  });

  test("owner can open context detail with copy and ask link when pack exists", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/context");
    const packLink = page.locator(".context-table a", { hasText: "Open" }).first();
    if ((await packLink.count()) === 0) {
      test.skip();
      return;
    }
    await packLink.click();
    await expect(page.getByRole("button", { name: /Copy for Cursor/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ask about this context/i })).toBeVisible();
    await expect(page.getByText(/Validation Requirements/i)).toBeVisible();
  });

  test("auditor cannot access context page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");

    await page.goto("/context");
    await expect(page).toHaveURL(/\/audits/);
  });
});
