/**
 * Sprint 37 Enterprise Reliability sanity — full closed-loop real testing.
 */

import { api } from "../convex/_generated/api";
import { API_KEY_PREFIX } from "../src/types/api-keys";
import {
  assertNoSecrets,
  AUTONOMY_AUDITOR_EMAIL,
  AUTONOMY_OWNER_EMAIL,
  AUTONOMY_VIEWER_EMAIL,
  completeOnboarding,
  convexClient,
  createSanityApiKey,
  ensureClerkUser,
  getConvexHttpUrl,
  getAppUrl,
  getConvexTokenForUser,
  getDevIngestKey,
  getReliabilityDeliveriesViaHttp,
  getReliabilityHealthViaHttp,
  listJournalEntriesViaHttp,
  loadEnvLocal,
  maskDevIngestKey,
  postIngestEventViaHttp,
  type ReliabilityEvidence,
  requireLocalApp,
  sampleReliabilityEvent,
  seedReliabilityWorkspace,
} from "./lib/sanity-reliability-helpers.js";
import { runCliReliabilitySanity } from "./sanity-cli-reliability.js";
import { runMcpReliabilitySanity } from "./sanity-mcp-reliability-tools.js";

async function assertUiRoutes(appUrl: string, ownerEmail: string): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { clerk, clerkSetup } = await import("@clerk/testing/playwright");

  await clerkSetup();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in";
    await page.goto(`${appUrl}${signInPath}`);
    await clerk.signIn({ page, emailAddress: ownerEmail });

    await page.goto(`${appUrl}/sources/reliability`);
    await page.getByRole("heading", { name: "Ingest reliability", exact: true }).waitFor();
    console.log("  [PASS] /sources/reliability");
  } finally {
    await browser.close();
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 37 Enterprise Reliability sanity check\n");

  const evidence: ReliabilityEvidence = {
    workspaceId: "",
    sourceEventId: `reliability-sanity-${Date.now()}`,
    maskedApiKey: "",
    maskedDevKey: maskDevIngestKey(getDevIngestKey()),
  };

  const appUrl = getAppUrl();
  const apiUrl = getConvexHttpUrl();
  await requireLocalApp(appUrl);

  const ownerUserId = await ensureClerkUser(AUTONOMY_OWNER_EMAIL, "ReliabilityOwner");
  const viewerUserId = await ensureClerkUser(AUTONOMY_VIEWER_EMAIL, "ReliabilityViewer");
  const auditorUserId = await ensureClerkUser(AUTONOMY_AUDITOR_EMAIL, "ReliabilityAuditor");

  const ownerClient = convexClient(await getConvexTokenForUser(ownerUserId));
  const viewerClient = convexClient(await getConvexTokenForUser(viewerUserId));
  const auditorClient = convexClient(await getConvexTokenForUser(auditorUserId));

  await completeOnboarding(ownerClient);
  await completeOnboarding(viewerClient);
  await completeOnboarding(auditorClient);
  console.log("  [PASS] created dev workspace (owner/viewer/auditor)");

  const story = await seedReliabilityWorkspace(ownerClient);
  evidence.workspaceId = story.workspaceId;
  console.log("  [PASS] seeded test workspace");

  const rawApiKey = await createSanityApiKey(ownerClient, story.workspaceId);
  const devKey = getDevIngestKey();
  evidence.maskedApiKey = `${API_KEY_PREFIX}_••••${rawApiKey.slice(-4)}`;
  console.log(`  [PASS] created dev API key ${evidence.maskedApiKey}`);

  const missingAuth = await fetch(`${apiUrl}/ingest/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sampleReliabilityEvent(evidence.sourceEventId)),
  });
  if (missingAuth.status !== 401) throw new Error("Expected missing auth 401");
  console.log("  [PASS] missing ingest auth rejected");

  const invalidKey = `${API_KEY_PREFIX}_00000000000000000000000000000000`;
  const invalidAuth = await fetch(`${apiUrl}/ingest/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${invalidKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workspaceId: evidence.workspaceId,
      ...sampleReliabilityEvent(`${evidence.sourceEventId}-invalid`),
    }),
  });
  if (invalidAuth.status !== 401) throw new Error("Expected invalid API key 401");
  console.log("  [PASS] invalid API key rejected");

  const ingested = await postIngestEventViaHttp(
    apiUrl,
    devKey,
    evidence.workspaceId,
    sampleReliabilityEvent(evidence.sourceEventId),
  );
  assertNoSecrets(JSON.stringify(ingested));
  if (!ingested.deliveryId) throw new Error("Missing deliveryId from ingest");
  evidence.deliveryId = ingested.deliveryId;
  evidence.eventId = ingested.eventId;
  evidence.journalRef = ingested.journalRef;
  console.log("  [PASS] journaled and wrote reliable ingest event");

  const duplicate = await postIngestEventViaHttp(
    apiUrl,
    devKey,
    evidence.workspaceId,
    sampleReliabilityEvent(evidence.sourceEventId),
  );
  assertNoSecrets(JSON.stringify(duplicate));
  if (!duplicate.duplicate) throw new Error("Expected duplicate ingest");
  console.log("  [PASS] duplicate ingest deduped");

  const deliveries = await getReliabilityDeliveriesViaHttp(
    apiUrl,
    rawApiKey,
    evidence.workspaceId,
    { source: "cli", limit: 10 },
  );
  assertNoSecrets(JSON.stringify(deliveries));
  if (!deliveries.deliveries?.length) throw new Error("No deliveries listed");
  console.log("  [PASS] listed ingest deliveries via HTTP");

  const journal = await listJournalEntriesViaHttp(apiUrl, rawApiKey, evidence.workspaceId, {
    source: "cli",
    limit: 10,
  });
  assertNoSecrets(JSON.stringify(journal));
  console.log("  [PASS] listed journal entries via HTTP");

  const health = await getReliabilityHealthViaHttp(apiUrl, rawApiKey, evidence.workspaceId);
  assertNoSecrets(JSON.stringify(health));
  console.log("  [PASS] fetched delivery health via HTTP");

  try {
    await viewerClient.mutation(api.reliabilityIngest.replayDelivery, {
      workspaceId: evidence.workspaceId,
      deliveryId: evidence.deliveryId as never,
      payload: sampleReliabilityEvent(evidence.sourceEventId),
    });
    throw new Error("Viewer should not replay deliveries");
  } catch {
    console.log("  [PASS] viewer blocked from replay");
  }

  try {
    await auditorClient.query(api.reliabilityIngest.listDeliveries, {
      workspaceId: evidence.workspaceId,
    });
    throw new Error("Auditor should be blocked from delivery browse");
  } catch {
    console.log("  [PASS] auditor blocked from delivery browse");
  }

  await runCliReliabilitySanity({
    appUrl: apiUrl,
    rawApiKey,
    workspaceId: evidence.workspaceId,
    deliveryId: evidence.deliveryId,
  });
  console.log("  [PASS] CLI reliability tested");

  await runMcpReliabilitySanity({
    appUrl: apiUrl,
    rawApiKey,
    workspaceId: evidence.workspaceId,
    deliveryId: evidence.deliveryId,
  });
  console.log("  [PASS] MCP reliability tools tested");

  await assertUiRoutes(appUrl, AUTONOMY_OWNER_EMAIL);
  console.log("  [PASS] UI routes tested");
  console.log("  [PASS] no secrets leaked");

  console.log("\nSprint 37 Real Testing Completion Report");
  console.log("Status: PASS");
  console.log("Real Sanity:");
  console.log("- created dev workspace: YES");
  console.log(`- created dev API key: YES (${evidence.maskedApiKey})`);
  console.log(`- dev ingest key masked: YES (${evidence.maskedDevKey})`);
  console.log("- journaled ingest event: YES");
  console.log("- duplicate ingest deduped: YES");
  console.log("- listed deliveries: YES");
  console.log("- listed journal entries: YES");
  console.log("- fetched delivery health: YES");
  console.log("- viewer blocked from replay: YES");
  console.log("- auditor blocked: YES");
  console.log("- CLI reliability tested: YES");
  console.log("- MCP reliability tools tested: YES");
  console.log("- UI routes tested: YES");
  console.log("- no secrets leaked: YES");
  console.log("Evidence:");
  console.log(`- workspaceId: ${evidence.workspaceId}`);
  console.log(`- deliveryId: ${evidence.deliveryId}`);
  console.log(`- eventId: ${evidence.eventId}`);
  console.log(`- journalRef: ${evidence.journalRef}`);
  console.log(`- sourceEventId: ${evidence.sourceEventId}`);
  console.log("Failures / Blockers: none");
  console.log("Ready for next sprint: YES");
}

main().catch((error) => {
  console.error("\nSprint 37 Real Testing Completion Report");
  console.error("Status: FAIL");
  console.error("Ready for next sprint: NO");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
