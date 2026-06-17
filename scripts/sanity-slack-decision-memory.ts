/**
 * Sprint 39 Decision & Slack Memory sanity — closed-loop validation.
 */

import { createHmac } from "node:crypto";
import { api } from "../convex/_generated/api";
import {
  AUTONOMY_AUDITOR_EMAIL,
  AUTONOMY_OWNER_EMAIL,
  completeOnboarding,
  convexClient,
  createSanityApiKey,
  ensureClerkUser,
  getConvexHttpUrl,
  getAppUrl,
  getConvexTokenForUser,
  loadEnvLocal,
  requireLocalApp,
} from "./lib/sanity-reliability-helpers.js";
import { runCliDecisionsSanity } from "./sanity-cli-decisions.js";
import { runMcpDecisionToolsSanity } from "./sanity-mcp-decision-tools.js";

function buildSlackSignature(body: string, secret: string, timestamp: string): string {
  const base = `v0:${timestamp}:${body}`;
  const digest = createHmac("sha256", secret).update(base).digest("hex");
  return `v0=${digest}`;
}

async function postSlackWebhook(
  apiUrl: string,
  workspaceId: string,
  body: string,
  secret: string,
): Promise<Response> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = buildSlackSignature(body, secret, timestamp);
  return fetch(`${apiUrl}/webhooks/slack?workspaceId=${encodeURIComponent(workspaceId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Slack-Request-Timestamp": timestamp,
      "X-Slack-Signature": signature,
    },
    body,
  });
}

async function assertUiRoutes(appUrl: string, ownerEmail: string): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { clerk, clerkSetup } = await import("@clerk/testing/playwright");

  await clerkSetup();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in";
    await page.goto(`${appUrl}${signInPath}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await clerk.signIn({ page, emailAddress: ownerEmail });

    await page.goto(`${appUrl}/timeline/decisions`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByRole("heading", { name: "Decisions", exact: true }).waitFor({ timeout: 60_000 });
    console.log("  [PASS] /timeline/decisions");

    await page.goto(`${appUrl}/sources`);
    await page.locator(".slack-source-card").waitFor();
    console.log("  [PASS] Slack source card");
  } finally {
    await browser.close();
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 39 Decision & Slack Memory sanity check\n");

  const appUrl = getAppUrl();
  const apiUrl = getConvexHttpUrl();
  await requireLocalApp(appUrl);

  const ownerUserId = await ensureClerkUser(AUTONOMY_OWNER_EMAIL, "DecisionOwner");
  const auditorUserId = await ensureClerkUser(AUTONOMY_AUDITOR_EMAIL, "DecisionAuditor");

  const ownerClient = convexClient(await getConvexTokenForUser(ownerUserId));
  const auditorClient = convexClient(await getConvexTokenForUser(auditorUserId));

  await completeOnboarding(ownerClient);
  await completeOnboarding(auditorClient);

  const workspace = await ownerClient.query(api.workspaces.getState, {});
  if (!workspace?.activeWorkspaceId) {
    throw new Error("No active workspace for owner");
  }
  const workspaceId = workspace.activeWorkspaceId;

  const rawKey = await createSanityApiKey(ownerClient, workspaceId);
  const signingSecret = `slack_sanity_secret_${Date.now()}`;

  await ownerClient.mutation(api.integrations.slack.saveSigningSecret, {
    workspaceId,
    rawSecret: signingSecret,
  });
  console.log("  [PASS] Slack signing secret saved");

  const challengeBody = JSON.stringify({
    type: "url_verification",
    challenge: "sanity-challenge",
  });
  const challengeRes = await fetch(
    `${apiUrl}/webhooks/slack?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: challengeBody,
    },
  );
  const challengeJson = (await challengeRes.json()) as { challenge?: string };
  if (challengeJson.challenge !== "sanity-challenge") {
    throw new Error("url_verification challenge mismatch");
  }
  console.log("  [PASS] Slack url_verification");

  const mentionBody = JSON.stringify({
    type: "event_callback",
    event_id: `sanity-slack-${Date.now()}`,
    event: {
      type: "app_mention",
      text: "Decision: sanity capture from Slack",
      channel: "C_SANITY",
      user: "U_SANITY",
    },
  });
  const mentionRes = await postSlackWebhook(apiUrl, workspaceId, mentionBody, signingSecret);
  if (!mentionRes.ok) {
    const errText = await mentionRes.text();
    throw new Error(`Signed Slack webhook failed: ${mentionRes.status} ${errText}`);
  }
  console.log("  [PASS] Signed Slack webhook ingest");

  const decisionId = await runCliDecisionsSanity({
    apiUrl,
    rawApiKey: rawKey,
    workspaceId,
  });

  await runMcpDecisionToolsSanity({
    apiUrl,
    rawApiKey: rawKey,
    workspaceId,
  });

  const decisions = await ownerClient.query(api.decisions.listDecisions, {
    workspaceId,
    limit: 10,
  });
  if (!decisions.length) {
    throw new Error("No decisions visible to owner after sanity flow");
  }
  console.log("  [PASS] Convex decisions.listDecisions");

  const auditorDecisions = await auditorClient.query(api.decisions.listDecisions, {
    workspaceId,
    limit: 10,
  });
  if (auditorDecisions.length > 0) {
    throw new Error("Auditor should not browse decisions");
  }
  console.log("  [PASS] Auditor blocked from decisions browse");

  await assertUiRoutes(appUrl, AUTONOMY_OWNER_EMAIL);

  console.log("\nRunning Sprint 38 regression checks...");
  const { execSync } = await import("node:child_process");
  execSync("npm run assert:no-next-backend-routes", { stdio: "inherit" });
  execSync("npm run sanity:convex-api-surface", { stdio: "inherit" });
  execSync("npm run sanity:enterprise-reliability", { stdio: "inherit" });

  console.log(`\nDecision detail sanity id: ${decisionId}`);
  console.log("\nSprint 39 Decision & Slack Memory sanity: ALL PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
