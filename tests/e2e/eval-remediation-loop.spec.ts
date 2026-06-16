import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

describeE2E("Eval remediation loop", () => {
  test("intelligence hub shows private evals remediation links", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/intelligence");
    await expect(page.getByRole("heading", { name: /^Private Evals$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Review failed evals/i })).toBeVisible();
  });

  test("eval runs list route responds", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/intelligence/evals");
    await expect(page.getByRole("heading", { name: /^Private Evals$/i })).toBeVisible();
  });
});

describeE2E("Eval remediation permissions", () => {
  test("auditor is redirected away from eval routes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");

    await page.goto("/intelligence/evals");
    await expect(page).not.toHaveURL(/\/intelligence\/evals$/);
  });
});
