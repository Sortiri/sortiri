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

describeE2E("sources health", () => {
  test("sources page loads with health data", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await waitForConvexAuth(page);
    await expect(page.getByRole("heading", { name: "Sources", exact: true })).toBeVisible();
    await expect(page.locator(".github-source-card")).toBeVisible();
    await expect(page.locator(".stripe-source-card")).toBeVisible();
  });

  test("GitHub card shows connected and masked secret after setup", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await waitForConvexAuth(page);

    const card = page.locator(".github-source-card");
    await card.getByRole("button", { name: "Create webhook secret" }).click();
    await expect(card.getByText(/Webhook secret saved/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(card.getByText(/whsec_sortiri_••••/)).toBeVisible({ timeout: 15000 });
  });

  test("Stripe card shows connected and masked secret after setup", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await waitForConvexAuth(page);

    const card = page.locator(".stripe-source-card");
    await card.getByPlaceholder("whsec_...").fill(TEST_STRIPE_WEBHOOK_SECRET);
    await card.getByRole("button", { name: "Save webhook secret" }).click();
    await expect(card.getByText(/Webhook secret saved/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(card.getByText(/whsec_••••/)).toBeVisible({ timeout: 15000 });
  });

  test("revoking GitHub secret updates status", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await waitForConvexAuth(page);

    const card = page.locator(".github-source-card");
    await card.getByRole("button", { name: "Create webhook secret" }).click();
    await expect(card.getByText(/whsec_sortiri_••••/)).toBeVisible({ timeout: 15000 });
    await card.getByRole("button", { name: "Revoke secret" }).click();
    await expect(card.getByText(/Webhook secret revoked/i).first()).toBeVisible({ timeout: 15000 });
  });

  test("member cannot manage integration secrets", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "member", "member-only");
    test.skip(!hasE2eMemberAuth, "E2E_MEMBER_EMAIL required");

    await page.goto("/sources");
    await waitForConvexAuth(page);

    const githubCard = page.locator(".github-source-card");
    const stripeCard = page.locator(".stripe-source-card");
    await expect(githubCard.getByRole("button", { name: "Create webhook secret" })).toBeDisabled();
    await expect(stripeCard.getByRole("button", { name: "Save webhook secret" })).toBeDisabled();
    await expect(page.getByText(/Admin access required to manage GitHub sources/i)).toBeVisible();
    await expect(page.getByText(/Admin access required to manage Stripe sources/i)).toBeVisible();
  });

  test("local sources still show event-based connected status via health", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/sources");
    await waitForConvexAuth(page);
    const client = await getAuthedClient(page);
    await client.mutation(api.testSeed.seedTestWorkspace, {});

    await page.reload();
    await waitForConvexAuth(page);
    await expect(page.getByText("Cursor MCP")).toBeVisible();
  });
});
