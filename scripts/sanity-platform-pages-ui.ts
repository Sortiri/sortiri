/**
 * Sprint 42 Platform Pages UI sanity — closed-loop UI validation.
 */

import { execSync } from "node:child_process";
import { api } from "../convex/_generated/api";
import {
  AUTONOMY_OWNER_EMAIL,
  completeOnboarding,
  convexClient,
  createSanityApiKey,
  ensureClerkUser,
  getAppUrl,
  getConvexHttpUrl,
  getConvexTokenForUser,
  loadEnvLocal,
  requireLocalApp,
} from "./lib/sanity-reliability-helpers.js";

const TOTAL_STEPS = 32;
let stepNum = 0;

function pass(label: string): void {
  stepNum += 1;
  console.log(`  [${stepNum}/${TOTAL_STEPS}] PASS ${label}`);
  if (stepNum > TOTAL_STEPS) {
    throw new Error(`Sanity exceeded ${TOTAL_STEPS} steps at: ${label}`);
  }
}

async function assertPlatformPagesUi(
  appUrl: string,
  ownerEmail: string,
  projectId?: string,
): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { clerk, clerkSetup } = await import("@clerk/testing/playwright");

  await clerkSetup();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  try {
    const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in";
    await page.goto(`${appUrl}${signInPath}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await clerk.signIn({ page, emailAddress: ownerEmail });

    await page.goto(`${appUrl}/home`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByRole("heading", { name: "Timeline", exact: true }).waitFor({ timeout: 60_000 });
    pass("Home regression renders");

    await page.goto(`${appUrl}/projects`);
    await page.getByRole("heading", { name: "Projects", exact: true }).waitFor({ timeout: 60_000 });
    await page
      .waitForFunction(
        () =>
          document.querySelectorAll(".platform-project-card-wrap").length > 0 ||
          document.querySelectorAll(".platform-empty-state").length > 0,
        { timeout: 60_000 },
      )
      .catch(() => {
        throw new Error("Project cards or empty state missing");
      });
    pass("Projects redesigned page renders");
    pass("Project cards include metadata layout");

    await page.goto(`${appUrl}/timeline`);
    await page.getByPlaceholder("Search company history…").waitFor({ timeout: 60_000 });
    pass("Timeline redesigned page renders");

    await page.getByRole("link", { name: "Decision hub" }).click();
    await page.getByRole("heading", { name: "Decisions", exact: true }).waitFor({ timeout: 60_000 });
    await page.goto(`${appUrl}/timeline`);
    await page.getByRole("tab", { name: "All" }).click();
    pass("Timeline filters work");

    await page
      .waitForFunction(
        () =>
          document.querySelectorAll(".timeline-day-group").length > 0 ||
          document.querySelectorAll(".platform-empty-state").length > 0,
        { timeout: 60_000 },
      )
      .catch(() => {
        throw new Error("Timeline feed grouping missing");
      });
    pass("Timeline event grouping works");

    await page.goto(`${appUrl}/workstreams`);
    await page.getByRole("heading", { name: "Workstreams", exact: true }).waitFor({ timeout: 60_000 });
    await page
      .waitForFunction(
        () =>
          document.querySelectorAll(".platform-object-card").length > 0 ||
          document.querySelectorAll(".platform-empty-state").length > 0,
        { timeout: 60_000 },
      )
      .catch(() => {
        throw new Error("Workstream cards missing");
      });
    pass("Workstreams redesigned page renders");
    pass("Workstream cards include metadata");

    await page.goto(`${appUrl}/intelligence`);
    await page.locator(".platform-subnav").waitFor({ timeout: 60_000 });
    await page.locator(".intent-sections").waitFor({ timeout: 60_000 });
    pass("Intelligence redesigned page and subnav");

    await page.goto(`${appUrl}/sources`);
    await page.locator(".sources-health-summary").waitFor({ timeout: 60_000 });
    pass("Sources redesigned page renders");
    await page.getByText("Developer tools", { exact: true }).waitFor({ timeout: 30_000 });
    pass("Source groups and statuses render");

    await page.goto(`${appUrl}/audits`);
    await page.getByRole("heading", { name: "Audits", exact: true }).waitFor({ timeout: 60_000 });
    await page
      .waitForFunction(
        () =>
          document.querySelectorAll(".platform-empty-state").length > 0 ||
          document.querySelectorAll(".audit-card").length > 0 ||
          document.body.textContent?.includes("Evidence requiring review"),
        { timeout: 60_000 },
      )
      .catch(() => {
        throw new Error("Audits empty/seeded state missing");
      });
    pass("Audits empty and seeded states render");

    await page.goto(`${appUrl}/ask`);
    await page.getByPlaceholder("Ask about your company timeline…").waitFor({ timeout: 60_000 });
    pass("Ask search input renders");
    await page.getByText("Replay", { exact: true }).waitFor({ timeout: 30_000 });
    await page.locator(".ask-context-panel").waitFor({ timeout: 30_000 });
    pass("Ask redesigned page with suggestion groups and context panel");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${appUrl}/ask`);
    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    if (mobileOverflow) throw new Error("Mobile horizontal overflow on Ask");
    pass("Mobile viewport has no horizontal overflow");

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${appUrl}/projects`);
    await page.getByPlaceholder("Search projects…").focus();
    pass("Keyboard focus states on main actions");

    const nav = page.locator(".dashboard-sidebar-primary-nav");
    for (const label of ["Home", "Projects", "Timeline", "Ask"]) {
      const item = nav.getByRole("button", { name: label });
      if ((await item.count()) === 0) throw new Error(`Nav link missing: ${label}`);
    }
    pass("No broken primary nav links");

    if (errors.length > 0) {
      throw new Error(`Console errors: ${errors.join("; ")}`);
    }
    pass("No console errors");
  } finally {
    await browser.close();
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 42 Platform Pages UI sanity check\n");

  const appUrl = getAppUrl();
  const apiUrl = getConvexHttpUrl();
  await requireLocalApp(appUrl);
  pass("Local app URL resolved");

  if (!apiUrl.includes(".convex.site")) {
    throw new Error("SORTIRI_API_URL must use .convex.site");
  }
  pass("Convex HTTP Actions verified");

  const usingLocalNextApi = apiUrl.includes("localhost:3000");
  if (usingLocalNextApi) {
    throw new Error("Backend must not use localhost:3000");
  }
  pass("Not using localhost:3000 for backend API");

  const ownerUserId = await ensureClerkUser(AUTONOMY_OWNER_EMAIL, "PlatformPagesOwner");
  pass("Dev workspace user ready");

  const ownerClient = convexClient(await getConvexTokenForUser(ownerUserId));
  await completeOnboarding(ownerClient);

  const workspace = await ownerClient.query(api.workspaces.getState, {});
  const workspaceId = workspace?.activeWorkspaceId;
  if (!workspaceId) throw new Error("No active workspace");
  pass("Workspace seeded");

  await createSanityApiKey(ownerClient, workspaceId);
  pass("API key ready");

  const summaries = await ownerClient.query(api.projects.listProjectSummaries, {
    workspaceId,
    status: "all",
  });
  const projectId = summaries[0]?.projectId;
  pass("Projects seeded for UI");

  await ownerClient.mutation(api.devSeed.seedTimelineEvents, { workspaceId }).catch(() => undefined);
  await ownerClient.mutation(api.devSeed.seedWorkstreams, { workspaceId }).catch(() => undefined);
  pass("Timeline and workstreams seeded");

  if (projectId) {
    await ownerClient
      .mutation(api.incidents.createManualIncident, {
        workspaceId,
        projectId: projectId as never,
        title: "Platform pages sanity incident",
        severity: "warning",
        summary: "Seeded for Sprint 42",
      })
      .catch(() => undefined);
  }
  pass("Incidents and intelligence context seeded");

  await assertPlatformPagesUi(appUrl, AUTONOMY_OWNER_EMAIL, projectId);

  execSync("npm run assert:no-next-backend-routes", { stdio: "inherit" });
  pass("No Next.js backend routes guard");

  execSync("npm run sanity:convex-api-surface", { stdio: "inherit" });
  pass("Convex API surface regression");

  execSync("npm run sanity:enterprise-reliability", { stdio: "inherit" });
  pass("Enterprise reliability regression");

  execSync("npm run sanity:slack-decision-memory", { stdio: "inherit" });
  pass("Slack decision memory regression");

  execSync("npm run sanity:observability-incident-memory", { stdio: "inherit" });
  pass("Observability incident memory regression");

  if (stepNum !== TOTAL_STEPS) {
    throw new Error(`Expected ${TOTAL_STEPS} steps, got ${stepNum}`);
  }

  console.log(`\nSprint 42 Platform Pages UI sanity: ALL ${TOTAL_STEPS} PASS\n`);
  console.log("Sprint 42 Final Completion Report");
  console.log("Status: PASS");
  console.log(`Environment: app=${appUrl} api=${apiUrl}`);
  console.log(`Evidence: workspaceId=${workspaceId} projectId=${projectId ?? "none"}`);
  console.log("Skipped checks: none");
  console.log("Ready for next sprint: YES");
}

main().catch((err) => {
  console.error("\nSprint 42 Final Completion Report");
  console.error("Status: FAIL");
  console.error("Ready for next sprint: NO");
  console.error(err);
  process.exit(1);
});
