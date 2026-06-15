import { test, expect } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { describeE2E, hasE2eMemberAuth } from "./helpers/auth";
import { getConvexAuthToken, waitForConvexAuth } from "./helpers/bootstrap";
import { TEST_POSTHOG_WEBHOOK_SECRET } from "../../convex/testSeed";

async function getAuthedClient(page: import("@playwright/test").Page) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
  const token = await getConvexAuthToken(page);
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  return client;
}

describeE2E("posthog source", () => {
  function posthogCard(page: import("@playwright/test").Page) {
    return page.locator(".posthog-source-card");
  }

  test("owner sees PostHog card and can create masked secret", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await waitForConvexAuth(page);

    const card = posthogCard(page);
    await expect(card.getByRole("heading", { name: "PostHog", exact: true })).toBeVisible();
    await expect(card.getByRole("button", { name: "Webhook URL" })).toBeVisible();
    await expect(card.getByText(/api\/integrations\/posthog\/webhook/i)).toBeVisible();

    await card.getByRole("button", { name: "Create webhook secret" }).click();
    await expect(card.getByText(/Webhook secret created/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(card.getByText(/phsec_sortiri/i).first()).toBeVisible();
  });

  test("owner send test event appears on timeline and product view", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await waitForConvexAuth(page);
    await posthogCard(page).getByRole("button", { name: "Send test event" }).click();
    await expect(page.getByText(/PostHog test event recorded/i)).toBeVisible({ timeout: 15000 });

    await page.goto("/timeline");
    await expect(page.getByText(/User signed up/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/PostHog/i).first()).toBeVisible();

    await page.goto("/views");
    await waitForConvexAuth(page);
    const productView = page.locator(".view-card").filter({ hasText: "Product" });
    if ((await productView.count()) === 0) {
      await page.getByRole("button", { name: "Create Default Views" }).click();
      await expect(productView.first()).toBeVisible({ timeout: 15000 });
    }
    await productView.first().click();
    await expect(page.getByText(/User signed up/i).first()).toBeVisible({ timeout: 15000 });
  });

  test("member cannot manage PostHog secret", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "member", "member-only");
    test.skip(!hasE2eMemberAuth, "E2E_MEMBER_EMAIL required");

    await page.goto("/sources");
    await waitForConvexAuth(page);
    const card = posthogCard(page);
    await expect(card.getByRole("heading", { name: "PostHog", exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Admin access required to manage PostHog sources/i)).toBeVisible();
    await expect(card.getByRole("button", { name: "Create webhook secret" })).toBeDisabled();
    await expect(card.getByRole("button", { name: "Revoke secret" })).toHaveCount(0);
  });

  test("seeded PostHog secret supports e2e webhook auth", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await waitForConvexAuth(page);
    const client = await getAuthedClient(page);
    const seeded = await client.mutation(api.testSeed.seedPostHogWebhookSecret, {});
    expect(seeded.webhookSecret).toBe(TEST_POSTHOG_WEBHOOK_SECRET);
  });
});
