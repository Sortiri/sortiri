import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";
import { getConvexHttpUrl } from "./helpers/apiUrl";

describeE2E("Decision memory", () => {
  test("timeline decisions hub loads for owner", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/timeline/decisions");
    await expect(page.getByRole("heading", { name: "Decisions", exact: true })).toBeVisible();
  });

  test("sources page shows Slack card", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await expect(page.locator(".slack-source-card")).toBeVisible();
  });

  test("slack webhook rejects missing signature", async ({ request }) => {
    const apiUrl = getConvexHttpUrl();
    const response = await request.post(`${apiUrl}/webhooks/slack?workspaceId=ws_test`, {
      data: { type: "event_callback", event_id: "Ev1", event: { type: "message" } },
    });
    expect([400, 401, 500]).toContain(response.status());
  });

  test("url_verification returns challenge without auth", async ({ request }) => {
    const apiUrl = getConvexHttpUrl();
    const response = await request.post(`${apiUrl}/webhooks/slack?workspaceId=ws_test`, {
      data: { type: "url_verification", challenge: "challenge-token" },
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { challenge?: string };
    expect(body.challenge).toBe("challenge-token");
  });
});

describeE2E("Decision memory permissions", () => {
  test("auditor cannot access timeline decisions hub", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");

    await page.goto("/timeline/decisions");
    await expect(page).not.toHaveURL(/\/timeline\/decisions$/);
  });
});
