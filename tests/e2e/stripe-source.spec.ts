import { test, expect } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { describeE2E, hasE2eMemberAuth } from "./helpers/auth";
import { getConvexAuthToken, waitForConvexAuth } from "./helpers/bootstrap";
import { TEST_STRIPE_WEBHOOK_SECRET } from "../../convex/testSeed";

async function getAuthedClient(page: import("@playwright/test").Page) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
  const token = await getConvexAuthToken(page);
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  return client;
}

describeE2E("stripe source", () => {
  function stripeCard(page: import("@playwright/test").Page) {
    return page.locator(".stripe-source-card");
  }

  test("owner sees Stripe card and can save masked secret", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await waitForConvexAuth(page);

    const card = stripeCard(page);
    await expect(card.getByRole("heading", { name: "Stripe", exact: true })).toBeVisible();
    await expect(card.getByRole("button", { name: "Webhook URL" })).toBeVisible();
    await expect(card.getByText(/api\/integrations\/stripe\/webhook/i)).toBeVisible();

    await card.getByPlaceholder("whsec_...").fill(TEST_STRIPE_WEBHOOK_SECRET);
    await card.getByRole("button", { name: "Save webhook secret" }).click();
    await expect(card.getByText(/Webhook secret saved/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("owner send test event appears on timeline and revenue view", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await waitForConvexAuth(page);
    await stripeCard(page).getByRole("button", { name: "Send test event" }).click();
    await expect(page.getByText(/Stripe test event recorded/i)).toBeVisible({ timeout: 15000 });

    await page.goto("/timeline");
    await expect(page.getByText(/Checkout completed/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Stripe/i).first()).toBeVisible();

    await page.goto("/views");
    await waitForConvexAuth(page);
    const revenueView = page.locator(".view-card").filter({ hasText: "Revenue" });
    if ((await revenueView.count()) === 0) {
      await page.getByRole("button", { name: "Create Default Views" }).click();
      await expect(revenueView.first()).toBeVisible({ timeout: 15000 });
    }
    await revenueView.first().click();
    await expect(page.getByText(/Checkout completed/i).first()).toBeVisible({ timeout: 15000 });
  });

  test("member cannot manage Stripe secret", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "member", "member-only");
    test.skip(!hasE2eMemberAuth, "E2E_MEMBER_EMAIL required");

    await page.goto("/sources");
    await waitForConvexAuth(page);
    await expect(page.getByRole("heading", { name: "Sources", exact: true })).toBeVisible({
      timeout: 15000,
    });
    const card = stripeCard(page);
    await expect(card.getByRole("heading", { name: "Stripe", exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Admin access required to manage Stripe sources/i)).toBeVisible();
    await expect(card.getByRole("button", { name: "Save webhook secret" })).toBeDisabled();
    await expect(card.getByRole("button", { name: "Revoke secret" })).toHaveCount(0);
  });

  test("owner can seed stripe webhook secret via Convex for API tests", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await waitForConvexAuth(page);
    const client = await getAuthedClient(page);
    await client.mutation(api.testSeed.seedTestWorkspace, {});
    const seeded = await client.mutation(api.testSeed.seedStripeWebhookSecret, {});
    expect(seeded.webhookSecret).toBe(TEST_STRIPE_WEBHOOK_SECRET);
  });
});
