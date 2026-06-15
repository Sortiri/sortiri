import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("private evals", () => {
  test("intelligence hub shows private evals section", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/intelligence");
    await expect(page.getByRole("heading", { name: /^Private Evals$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open Evals/i })).toBeVisible();
  });

  test("owner can open private evals list", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/intelligence/evals");
    await expect(page.getByRole("heading", { name: /^Private Evals$/i })).toBeVisible();
  });

  test("owner can open eval suite detail when one exists", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/intelligence/evals");
    const suiteLink = page.locator(".eval-suite-card a, .evals-list a").first();
    if ((await suiteLink.count()) === 0) {
      test.skip();
      return;
    }
    await suiteLink.click();
    await expect(page.getByRole("heading", { name: /^Eval:/i })).toBeVisible();
  });

  test("auditor cannot access private evals", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");

    await page.goto("/intelligence/evals");
    await expect(page).toHaveURL(/\/audits/);
  });
});
