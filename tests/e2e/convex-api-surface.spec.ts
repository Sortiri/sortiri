import { test, expect } from "@playwright/test";
import { describeE2E, skipForAuditor } from "./helpers/auth";

describeE2E("convex api surface", () => {
  test("sources page loads and shows convex webhook path", async ({ page }, testInfo) => {
    skipForAuditor(testInfo);
    await page.goto("/sources");
    await expect(page.getByRole("heading", { name: /sources/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    const body = await page.content();
    expect(body).toMatch(/webhooks\/(github|stripe|posthog)/);
    expect(body).not.toContain("/api/integrations/");
  });

  test("reliability page loads via convex client", async ({ page }, testInfo) => {
    skipForAuditor(testInfo);
    await page.goto("/sources/reliability");
    await expect(
      page.getByRole("heading", { name: "Ingest reliability", exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
