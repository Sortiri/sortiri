import { test, expect } from "@playwright/test";
import { describeE2E, hasE2eAuditorAuth } from "./helpers/auth";

describeE2E("Evidence Review", () => {
  test("owner can load evidence review page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/security/evidence");
    await expect(page.getByRole("heading", { name: "Evidence Review" })).toBeVisible();
  });

  test("auditor cannot access evidence review route", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");
    test.skip(!hasE2eAuditorAuth, "E2E_AUDITOR_EMAIL required");

    await page.goto("/home");
    await page.getByRole("button", { name: /Audits/i }).waitFor();
    await expect(page.getByRole("button", { name: /Timeline/i })).toHaveCount(0);

    await page.goto("/security/evidence");
    await page.waitForURL(/\/audits/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/audits/);
  });
});
