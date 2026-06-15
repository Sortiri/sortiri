import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("lessons and playbooks", () => {
  test("owner can open lessons and playbooks pages", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/lessons");
    await expect(page.getByRole("heading", { name: /^Lessons$/i })).toBeVisible();

    await page.goto("/playbooks");
    await expect(page.getByRole("heading", { name: /^Playbooks$/i })).toBeVisible();
  });

  test("owner can open lesson and playbook detail when data exists", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/lessons");
    const lessonLink = page.locator(".lessons-table a").first();
    if ((await lessonLink.count()) > 0) {
      await lessonLink.click();
      await expect(page.getByRole("link", { name: /Ask about this lesson/i })).toBeVisible();
    }

    await page.goto("/playbooks");
    const createDefaults = page.getByRole("button", { name: "Create Default Playbooks" });
    if ((await page.locator(".playbooks-table a").count()) === 0 && (await createDefaults.count()) > 0) {
      await createDefaults.click();
    }
    const playbookLink = page.locator(".playbooks-table a").first();
    if ((await playbookLink.count()) > 0) {
      await playbookLink.click();
      await expect(page.getByRole("button", { name: "Copy for Cursor" })).toBeVisible();
    }
  });

  test("owner impact detail shows generate lessons when generated analysis exists", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/impact");
    const firstLink = page.locator(".impact-table a").first();
    if ((await firstLink.count()) === 0) {
      test.skip();
      return;
    }
    await firstLink.click();
    const generateLessons = page.getByRole("button", { name: "Generate Lessons" });
    if ((await generateLessons.count()) > 0) {
      await expect(generateLessons).toBeVisible();
    }
  });

  test("auditor cannot access lessons page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");

    await page.goto("/lessons");
    await expect(page).toHaveURL(/\/audits/);
  });
});
