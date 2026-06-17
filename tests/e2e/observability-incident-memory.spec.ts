import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";
import { getConvexHttpUrl } from "./helpers/apiUrl";

describeE2E("Observability incident memory", () => {
  test("timeline incidents hub loads for owner", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/timeline/incidents");
    await expect(page.getByRole("heading", { name: "Incidents", exact: true })).toBeVisible();
  });

  test("sources page shows observability card", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await expect(page.locator(".observability-source-card")).toBeVisible();
  });

  test("observability webhook rejects missing signature", async ({ request }) => {
    const apiUrl = getConvexHttpUrl();
    const response = await request.post(`${apiUrl}/webhooks/observability?workspaceId=ws_test`, {
      data: {
        source: "generic",
        signalType: "deploy_failed",
        title: "Deploy failed",
      },
    });
    expect([400, 401, 500]).toContain(response.status());
  });
});

describeE2E("Observability incident memory permissions", () => {
  test("auditor cannot access timeline incidents hub", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");

    await page.goto("/timeline/incidents");
    await expect(page).not.toHaveURL(/\/timeline\/incidents$/);
  });
});
