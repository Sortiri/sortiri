import { test, expect } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { describeE2E, hasE2eAuditorAuth } from "./helpers/auth";

async function seedAuditReportForAuditor(page: import("@playwright/test").Page) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
  }

  const token = await page.evaluate(async () => {
    const clerk = (
      window as Window & {
        Clerk?: {
          session?: {
            getToken: (opts?: { template?: string }) => Promise<string | null>;
          };
        };
      }
    ).Clerk;
    return clerk?.session?.getToken({ template: "convex" });
  });

  if (!token) {
    throw new Error("Could not read Convex auth token");
  }

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  return client.mutation(api.testSeed.seedAuditReportWithEvidence, {
    auditorEmail: process.env.E2E_AUDITOR_EMAIL,
  });
}

describeE2E("audits", () => {
  test("owner can manage audit reports", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "owner", "owner-only");

    await page.goto("/audits");
    await expect(page.getByRole("heading", { name: /Audits/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /New report/i })).toBeVisible();

    await seedAuditReportForAuditor(page);
    await page.reload();
    await expect(page.getByText("E2E Audit Report").first()).toBeVisible();
  });

  test("auditor sees only granted audit report and is blocked from timeline", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");
    test.skip(!hasE2eAuditorAuth, "E2E_AUDITOR_EMAIL required");

    await page.goto("/audits");
    await expect(page.getByRole("heading", { name: /Audits/i })).toBeVisible();
    await expect(page.getByText("E2E Audit Report").first()).toBeVisible();

    await page.goto("/timeline");
    await expect(page).toHaveURL(/\/audits/);
  });

  test("auditor can open report-scoped ask", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auditor", "auditor-only");
    test.skip(!hasE2eAuditorAuth, "E2E_AUDITOR_EMAIL required");

    await page.goto("/audits");
    await page.getByText("E2E Audit Report").first().click();
    await page.getByRole("link", { name: /Ask about this report/i }).click();
    await expect(page).toHaveURL(/auditReportId=/);
    await expect(
      page.getByText(/Ask questions about evidence included in this audit report/i),
    ).toBeVisible();
  });
});
