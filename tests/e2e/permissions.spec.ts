import { test, expect } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { describeE2E, hasE2eMemberAuth } from "./helpers/auth";
import { getConvexAuthToken, waitForConvexAuth } from "./helpers/bootstrap";
import { TEST_PROJECT_BETA, TEST_PROJECT_NAME } from "../../convex/testSeed";

describeE2E("permissions", () => {
  test("owner can open team and sources", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/settings/team");
    await expect(page.getByRole("heading", { name: /Team/i })).toBeVisible();
    await expect(page.getByText(/Manage Projects/i).first()).toBeVisible();

    await page.goto("/sources");
    await expect(page.getByRole("heading", { name: "Sources", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Advanced — manual API key setup/i }).click();
    await expect(page.getByRole("button", { name: /Create key/i })).toBeVisible();
  });

  test("owner sees all test projects", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/projects");
    await expect(page.getByText(TEST_PROJECT_NAME)).toBeVisible();
    await expect(page.getByText(TEST_PROJECT_BETA)).toBeVisible();
  });

  test("member sees only assigned project", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "member", "member-only");
    test.skip(!hasE2eMemberAuth, "E2E_MEMBER_EMAIL required");

    await page.goto("/projects");
    await expect(page.getByText(TEST_PROJECT_NAME)).toBeVisible();
    await expect(page.getByText(TEST_PROJECT_BETA)).not.toBeVisible();
  });

  test("member cannot create API keys", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "member", "member-only");
    test.skip(!hasE2eMemberAuth, "E2E_MEMBER_EMAIL required");

    await page.goto("/sources");
    await expect(page.getByRole("heading", { name: "Sources", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Create key/i })).toHaveCount(0);
  });

  test("member timeline hides beta-only events", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "member", "member-only");
    test.skip(!hasE2eMemberAuth, "E2E_MEMBER_EMAIL required");

    await page.goto("/timeline");
    await waitForConvexAuth(page);
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    client.setAuth(await getConvexAuthToken(page));
    await client.mutation(api.testSeed.bootstrapTestMember, {});
    await page.reload();
    await waitForConvexAuth(page);
    await page.getByPlaceholder(/search company history/i).fill("Test PR #42");
    await expect(page.getByText(/Test PR #42/).first()).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder(/search company history/i).fill("Test PR Beta");
    await expect(page.getByText("Test PR Beta")).toHaveCount(0);
  });
});
