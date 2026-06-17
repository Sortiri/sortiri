import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";
import { getConvexHttpUrl } from "./helpers/apiUrl";

describeE2E("Enterprise reliability", () => {
  test("sources page loads for delivery health surfaces", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await expect(page.getByRole("heading", { name: "Sources", exact: true })).toBeVisible();
    await expect(page.locator(".github-source-card")).toBeVisible();
  });

  test("reliable ingest route rejects missing auth", async ({ request }) => {
    const apiUrl = getConvexHttpUrl();
    const response = await request.post(`${apiUrl}/ingest/events`, {
      data: {
        source: "cli",
        category: "agent_action",
        type: "e2e_reliability",
        actor: { type: "agent", name: "E2E" },
        title: "Reliability E2E",
      },
    });
    expect(response.status()).toBe(401);
  });

  test("reliability CLI route rejects missing API key", async ({ request }) => {
    const apiUrl = getConvexHttpUrl();
    const response = await request.get(
      `${apiUrl}/cli/reliability?workspaceId=ws_test`,
    );
    expect(response.status()).toBe(401);
  });
});

describeE2E("Enterprise reliability permissions", () => {
  test("auditor is redirected away from reliability routes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");

    await page.goto("/sources/reliability");
    await expect(page).not.toHaveURL(/\/sources\/reliability$/);
  });
});
