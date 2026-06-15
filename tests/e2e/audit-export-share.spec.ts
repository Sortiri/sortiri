import { test, expect } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { describeE2E } from "./helpers/auth";
import { getConvexAuthToken, waitForConvexAuth } from "./helpers/bootstrap";

async function seedAuditReport(page: import("@playwright/test").Page) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is required");

  await page.goto("/audits");
  await waitForConvexAuth(page);

  const token = await getConvexAuthToken(page);
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  return client.mutation(api.testSeed.seedAuditReportWithEvidence, {});
}

async function getAuthedClient(page: import("@playwright/test").Page) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
  const token = await getConvexAuthToken(page);
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  return client;
}

describeE2E("audit export and share", () => {
  test("owner can export and manage share links on finalized report", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await seedAuditReport(page);
    await page.reload();
    await page.getByRole("link", { name: /E2E Audit Report/i }).first().click();

    await expect(page.getByRole("heading", { name: "Export" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Share Links" })).toBeVisible();

    await page.getByRole("button", { name: "Create link" }).click();
    await expect(page.getByText(/Copy this link now/i)).toBeVisible({ timeout: 15000 });

    const shareUrlText = await page.locator(".audit-share-links-section__token").textContent();
    expect(shareUrlText).toContain("/share/audit/");

    const reportUrl = page.url();
    const reportId = reportUrl.split("/audits/")[1]?.split(/[?#]/)[0];
    expect(reportId).toBeTruthy();

    const mdResponse = await page.request.get(`/api/audits/${reportId}/export/markdown`);
    expect(mdResponse.ok()).toBeTruthy();
    const mdBody = await mdResponse.text();
    expect(mdBody).toContain("E2E Audit Report");

    const htmlResponse = await page.request.get(`/api/audits/${reportId}/export/html`);
    expect(htmlResponse.ok()).toBeTruthy();

    const jsonResponse = await page.request.get(`/api/audits/${reportId}/export/json`);
    expect(jsonResponse.ok()).toBeTruthy();
    const jsonBody = await jsonResponse.json();
    expect(jsonBody.report.title).toContain("E2E Audit Report");

    await page.getByRole("button", { name: "Revoke" }).first().click();
    await expect(page.getByText("revoked").first()).toBeVisible({ timeout: 10000 });
  });

  test("share link renders report without workspace sidebar", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only — seeds share link");

    await seedAuditReport(page);
    const client = await getAuthedClient(page);
    const seeded = await client.mutation(api.testSeed.seedAuditShareLink, {
      status: "active",
    });

    const context = await page.context().browser()?.newContext();
    if (!context) throw new Error("Could not create browser context");
    const guestPage = await context.newPage();

    await guestPage.goto(seeded.shareUrl);
    await expect(guestPage.getByText("Sortiri Audit Report")).toBeVisible({ timeout: 15000 });
    await expect(guestPage.getByText("E2E Audit Report")).toBeVisible();
    await expect(guestPage.getByText("Ask Sortiri is unavailable on shared links")).toBeVisible();
    await expect(guestPage.locator(".app-sidebar")).toHaveCount(0);

    const mdResponse = await request.get(
      `/api/share/audit/${seeded.rawToken}/export/markdown`,
    );
    expect(mdResponse.ok()).toBeTruthy();

    await client.mutation(api.auditSharing.revokeShareLink, {
      shareLinkId: seeded.shareLinkId,
    });

    await guestPage.reload();
    await expect(guestPage.getByText(/Link unavailable/i)).toBeVisible({ timeout: 15000 });

    await context.close();
  });
});
