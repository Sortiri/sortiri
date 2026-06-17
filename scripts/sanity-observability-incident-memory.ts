/**
 * Sprint 40 Observability & Incident Memory sanity — 45-step closed-loop validation.
 */

import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
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
import { runCliIncidentsSanity } from "./sanity-cli-incidents.js";
import { runMcpIncidentToolsSanity } from "./sanity-mcp-incident-tools.js";

const TOTAL_STEPS = 45;
const FIXTURES_DIR = path.join(process.cwd(), "tests/fixtures/observability");

let stepNum = 0;

function pass(label: string): void {
  stepNum += 1;
  console.log(`  [${stepNum}/${TOTAL_STEPS}] PASS ${label}`);
  if (stepNum > TOTAL_STEPS) {
    throw new Error(`Sanity exceeded ${TOTAL_STEPS} steps at: ${label}`);
  }
}

function buildObservabilitySignature(body: string, secret: string, timestamp: string): string {
  const base = `v0:${timestamp}:${body}`;
  const digest = createHmac("sha256", secret).update(base).digest("hex");
  return `v0=${digest}`;
}

async function postObservabilityWebhook(
  apiUrl: string,
  workspaceId: string,
  body: string,
  secret: string,
): Promise<Response> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = buildObservabilitySignature(body, secret, timestamp);
  return fetch(`${apiUrl}/webhooks/observability?workspaceId=${encodeURIComponent(workspaceId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sortiri-request-timestamp": timestamp,
      "x-sortiri-signature": signature,
    },
    body,
  });
}

function loadFixture(name: string): string {
  const payload = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8")) as Record<
    string,
    unknown
  >;
  const unique = `${name.replace(".json", "")}-${Date.now()}`;
  payload.event_id = unique;
  if (typeof payload.id === "string") {
    payload.id = `${payload.id}-${Date.now()}`;
  }
  if (typeof payload.sourceSignalId === "string") {
    payload.sourceSignalId = `${payload.sourceSignalId}-${Date.now()}`;
  }
  return JSON.stringify(payload);
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

    await page.goto(`${appUrl}/timeline/incidents`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByRole("heading", { name: "Incidents", exact: true }).waitFor({ timeout: 60_000 });
    pass("/timeline/incidents hub");

    await page.goto(`${appUrl}/sources`);
    await page.locator(".observability-source-card").waitFor();
    pass("Observability source card");
  } finally {
    await browser.close();
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 40 Observability & Incident Memory sanity check\n");

  const appUrl = getAppUrl();
  const apiUrl = getConvexHttpUrl();
  await requireLocalApp(appUrl);
  pass("local app reachable");

  const ownerUserId = await ensureClerkUser(AUTONOMY_OWNER_EMAIL, "IncidentOwner");
  pass("owner clerk user ready");

  const auditorUserId = await ensureClerkUser(AUTONOMY_AUDITOR_EMAIL, "IncidentAuditor");
  pass("auditor clerk user ready");

  const ownerClient = convexClient(await getConvexTokenForUser(ownerUserId));
  const auditorClient = convexClient(await getConvexTokenForUser(auditorUserId));
  pass("convex clients initialized");

  await completeOnboarding(ownerClient);
  pass("owner onboarding complete");

  await completeOnboarding(auditorClient);
  pass("auditor onboarding complete");

  const workspace = await ownerClient.query(api.workspaces.getState, {});
  if (!workspace?.activeWorkspaceId) {
    throw new Error("No active workspace for owner");
  }
  const workspaceId = workspace.activeWorkspaceId;
  pass("active workspace resolved");

  const rawKey = await createSanityApiKey(ownerClient, workspaceId);
  pass("sanity API key created");

  const signingSecret = `obs_sanity_secret_${Date.now()}`;
  await ownerClient.mutation(api.integrations.observability.saveSigningSecret, {
    workspaceId,
    rawSecret: signingSecret,
  });
  pass("observability signing secret saved");

  const status = await ownerClient.query(api.integrations.observability.getObservabilityStatus, {
    workspaceId,
  });
  if (!status?.connected) {
    throw new Error("Observability status not connected");
  }
  pass("observability integration connected");

  if (!status.maskedSecret?.includes("•")) {
    throw new Error("Observability secret not masked in status");
  }
  pass("observability secret masked in status");

  const unsignedRes = await fetch(
    `${apiUrl}/webhooks/observability?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "generic", title: "unsigned" }),
    },
  );
  if (![401, 400].includes(unsignedRes.status)) {
    throw new Error(`Expected unsigned webhook rejection, got ${unsignedRes.status}`);
  }
  pass("unsigned webhook rejected");

  const invalidBody = JSON.stringify({ source: "generic", title: "invalid sig" });
  const invalidTimestamp = String(Math.floor(Date.now() / 1000));
  const invalidRes = await fetch(
    `${apiUrl}/webhooks/observability?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sortiri-request-timestamp": invalidTimestamp,
        "x-sortiri-signature": "v0=deadbeef",
      },
      body: invalidBody,
    },
  );
  if (invalidRes.status !== 401) {
    throw new Error(`Expected invalid signature rejection, got ${invalidRes.status}`);
  }
  pass("invalid signature rejected");

  for (const fixture of [
    "incident_opened.json",
    "deploy_failed.json",
    "rollback_completed.json",
    "incident_resolved.json",
  ]) {
    const body = loadFixture(fixture);
    const res = await postObservabilityWebhook(apiUrl, workspaceId, body, signingSecret);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Signed webhook ${fixture} failed: ${res.status} ${errText}`);
    }
    pass(`signed webhook ingest (${fixture})`);
  }

  const incidentId = await runCliIncidentsSanity({
    apiUrl,
    rawApiKey: rawKey,
    workspaceId,
    onStep: pass,
  });

  const mcpIncidentId = await runMcpIncidentToolsSanity({
    apiUrl,
    rawApiKey: rawKey,
    workspaceId,
    onStep: pass,
  });

  const incidents = await ownerClient.query(api.incidents.listIncidents, {
    workspaceId,
    limit: 20,
  });
  if (!incidents.length) {
    throw new Error("No incidents visible to owner after sanity flow");
  }
  pass("Convex incidents.listIncidents");

  const resolvedIncidents = incidents.filter((row) =>
    ["resolved", "rolled_back", "archived"].includes(row.status),
  );
  if (!resolvedIncidents.length) {
    throw new Error("Expected at least one resolved incident");
  }
  pass("resolved incident present");

  const openIncidents = incidents.filter((row) =>
    ["open", "investigating", "mitigated"].includes(row.status),
  );
  if (!openIncidents.length) {
    throw new Error("Expected at least one open incident from webhook ingest");
  }
  pass("open incident present");

  const signals = await ownerClient.query(api.incidents.listObservabilitySignals, {
    workspaceId,
    limit: 100,
  });
  if (!signals.length) {
    throw new Error("No observability signals visible to owner after webhook ingest");
  }
  pass("Convex incidents.listObservabilitySignals");

  const deployFailures = signals.filter((row) => row.signalType === "deploy_failed");
  if (!deployFailures.length) {
    throw new Error("Expected deploy_failed signal from fixture ingest");
  }
  pass("deploy_failed signal present");

  const openedSignals = signals.filter((row) => row.signalType === "incident_opened");
  if (!openedSignals.length) {
    throw new Error("Expected incident_opened signal from fixture ingest");
  }
  pass("incident_opened signal present");

  const rollbackSignals = signals.filter((row) => row.signalType === "rollback_completed");
  if (!rollbackSignals.length) {
    throw new Error("Expected rollback_completed signal from fixture ingest");
  }
  pass("rollback_completed signal present");

  const resolvedSignals = signals.filter((row) => row.signalType === "incident_resolved");
  if (!resolvedSignals.length) {
    throw new Error("Expected incident_resolved signal from fixture ingest");
  }
  pass("incident_resolved signal present");

  const auditorIncidents = await auditorClient.query(api.incidents.listIncidents, {
    workspaceId,
    limit: 10,
  });
  if (auditorIncidents.length > 0) {
    throw new Error("Auditor should not browse incidents");
  }
  pass("auditor blocked from incidents browse");

  const auditorSignals = await auditorClient.query(api.incidents.listObservabilitySignals, {
    workspaceId,
    limit: 10,
  });
  if (auditorSignals.length > 0) {
    throw new Error("Auditor should not browse observability signals");
  }
  pass("auditor blocked from signals browse");

  await ownerClient.mutation(api.integrations.observability.sendTestEvent, { workspaceId });
  pass("observability test event mutation");

  const health = await ownerClient.query(api.integrations.health.getSourceHealth, {
    workspaceId,
  });
  const observabilityHealth = health.find((row) => row.source === "observability");
  if (!observabilityHealth) {
    throw new Error("Observability source health missing");
  }
  pass("observability source health");

  const rollbacks = await ownerClient.query(api.decisions.listRollbacks, {
    workspaceId,
    limit: 10,
  });
  if (!Array.isArray(rollbacks)) {
    throw new Error("Rollbacks query failed");
  }
  pass("rollbacks query reachable");

  const detail = incidents.find((row) => row.id === incidentId || row.id === mcpIncidentId);
  if (!detail?.service) {
    const anyWithService = incidents.find((row) => row.service === "api");
    if (!anyWithService) {
      throw new Error("Expected incident with service=api");
    }
  }
  pass("incident service metadata present");

  const apiSignals = signals.filter((row) => row.service === "api" || row.service === "sortiri-api");
  if (!apiSignals.length) {
    throw new Error("Expected observability signal with api service");
  }
  pass("signal service metadata present");

  await assertUiRoutes(appUrl, AUTONOMY_OWNER_EMAIL);

  console.log("\nRunning Sprint 39 regression checks...");
  const { execSync } = await import("node:child_process");
  execSync("npm run assert:no-next-backend-routes", { stdio: "inherit" });
  pass("no Next backend routes");

  execSync("npm run sanity:convex-api-surface", { stdio: "inherit" });
  pass("convex API surface");

  execSync("npm run sanity:enterprise-reliability", { stdio: "inherit" });
  pass("enterprise reliability regression");

  if (stepNum !== TOTAL_STEPS) {
    throw new Error(`Expected ${TOTAL_STEPS} steps, got ${stepNum}`);
  }

  console.log(`\nIncident detail sanity ids: cli=${incidentId}, mcp=${mcpIncidentId}`);
  console.log(`\nSprint 40 Observability & Incident Memory sanity: ALL ${TOTAL_STEPS} PASS`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
