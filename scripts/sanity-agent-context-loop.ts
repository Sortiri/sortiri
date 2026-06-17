/**
 * Sprint 33 Agent Context Loop sanity check — real API-key HTTP, CLI, MCP, UI, permissions.
 *
 * Usage: npx tsx scripts/sanity-agent-context-loop.ts
 */

import {
  assertContextSections,
  assertNoSecrets,
  completeOnboarding,
  CONTEXT_AUDITOR_EMAIL,
  CONTEXT_OWNER_EMAIL,
  convexClient,
  createContextPackViaHttp,
  ensureClerkUser,
  getAppUrl,
  getContextPackRoute,
  getConvexTokenForUser,
  loadEnvLocal,
  maskApiKey,
  postContextRoute,
  requireLocalApp,
} from "./lib/sanity-context-helpers.js";
import { runCliContextSanity } from "./sanity-cli-context.js";
import { runMcpContextSanity } from "./sanity-mcp-context-tools.js";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { API_KEY_PREFIX } from "../src/types/api-keys";

const CONTEXT_GOAL = "Fix Stripe webhook failures";

async function assertUiRoutes(
  appUrl: string,
  ownerEmail: string,
  contextPackId: string,
): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { clerk, clerkSetup } = await import("@clerk/testing/playwright");

  await clerkSetup();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${appUrl}/sign-in`);
    await clerk.signIn({ page, emailAddress: ownerEmail });

    await page.goto(`${appUrl}/context`);
    await page.getByRole("heading", { name: /^Agent Context$/i }).waitFor();
    console.log("  [PASS] /context route responds");

    await page.goto(`${appUrl}/context/${contextPackId}`);
    await page.getByRole("button", { name: /Copy for Cursor/i }).waitFor();
    await page.getByText(/Validation Requirements/i).waitFor();
    console.log("  [PASS] /context/<id> detail responds with Copy + validation");

    await page.goto(`${appUrl}/ask?contextPackId=${contextPackId}`);
    await page.getByRole("heading", { name: /^Ask Sortiri$/i }).waitFor();
    await page.getByText(/Context pack:/i).waitFor();
    console.log("  [PASS] /ask?contextPackId route responds");

    await page.goto(`${appUrl}/intelligence`);
    await page.getByRole("heading", { name: /^Intelligence$/i }).waitFor();
    await page.getByRole("heading", { name: /^Agent Context$/i }).waitFor();
    console.log("  [PASS] /intelligence Agent Context section responds");
  } finally {
    await browser.close();
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 33 Agent Context Loop sanity check\n");

  const appUrl = getAppUrl();
  await requireLocalApp(appUrl);

  const ownerUserId = await ensureClerkUser(CONTEXT_OWNER_EMAIL, "ContextOwner");
  const auditorUserId = await ensureClerkUser(CONTEXT_AUDITOR_EMAIL, "ContextAuditor");
  const ownerClient = convexClient(await getConvexTokenForUser(ownerUserId));
  const auditorClient = convexClient(await getConvexTokenForUser(auditorUserId));

  await completeOnboarding(ownerClient);
  await completeOnboarding(auditorClient);

  await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});
  await auditorClient.mutation(api.testSeed.bootstrapTestAuditor, {});
  console.log("  [PASS] Created dev workspace/project baseline");

  await ownerClient.mutation(api.testSeed.seedImpactStory, {});
  await ownerClient.mutation(api.testSeed.seedLessonsPlaybooksStory, {});
  const story = await ownerClient.mutation(api.testSeed.seedContextPackStory, {});
  console.log("  [PASS] Seeded context pack story");
  console.log("  [PASS] Created dev project/workstream");

  const seededFormatted = await ownerClient.query(api.contextPacks.getFormatted, {
    contextPackId: story.contextPackId as Id<"contextPacks">,
  });
  assertNoSecrets(seededFormatted.text);
  assertContextSections(seededFormatted.text);
  console.log("  [PASS] Seeded context pack contains playbook, lessons, failures, validation");

  const apiKeyResult = await ownerClient.mutation(api.apiKeys.create, {
    workspaceId: story.workspaceId,
    name: "Sprint 33 Sanity Context Key",
  });
  const rawApiKey = apiKeyResult.rawKey;
  console.log(`  [PASS] Created dev API key ${maskApiKey(rawApiKey)}`);

  const missingAuth = await postContextRoute(appUrl, "/cli/context/packs", {
    workspaceId: story.workspaceId,
    goal: CONTEXT_GOAL,
  });
  if (missingAuth.status !== 401) {
    throw new Error(`Expected missing API key to return 401, got ${missingAuth.status}`);
  }
  console.log("  [PASS] Missing API key rejected");

  const invalidKey = `${API_KEY_PREFIX}_00000000000000000000000000000000`;
  const invalidAuth = await postContextRoute(
    appUrl,
    "/cli/context/packs",
    { workspaceId: story.workspaceId, goal: CONTEXT_GOAL },
    invalidKey,
  );
  if (invalidAuth.status !== 401) {
    throw new Error(`Expected invalid API key to return 401, got ${invalidAuth.status}`);
  }
  console.log("  [PASS] Invalid API key rejected");

  const revokedKeyResult = await ownerClient.mutation(api.apiKeys.create, {
    workspaceId: story.workspaceId,
    name: "Sprint 33 Revoked Sanity Key",
  });
  await ownerClient.mutation(api.apiKeys.revoke, {
    apiKeyId: revokedKeyResult.apiKeyId as Id<"apiKeys">,
  });
  const revokedAuth = await postContextRoute(
    appUrl,
    "/cli/context/packs",
    { workspaceId: story.workspaceId, goal: CONTEXT_GOAL },
    revokedKeyResult.rawKey,
  );
  if (revokedAuth.status !== 401) {
    throw new Error(`Expected revoked API key to return 401, got ${revokedAuth.status}`);
  }
  console.log("  [PASS] Revoked API key rejected");

  const httpPack = await createContextPackViaHttp(
    appUrl,
    rawApiKey,
    story.workspaceId,
    CONTEXT_GOAL,
    story.projectId as Id<"projects">,
    story.workstreamId as Id<"workstreams">,
  );
  if (!httpPack.contextPackId || !httpPack.text) {
    throw new Error("Valid API key HTTP create did not return contextPackId/text");
  }
  console.log("  [PASS] Valid API key created context pack through HTTP route");

  assertContextSections(httpPack.text);
  assertNoSecrets(httpPack.text);
  console.log("  [PASS] HTTP context response contains recommended playbook");
  console.log("  [PASS] HTTP context response contains lessons");
  console.log("  [PASS] HTTP context response contains known failures");
  console.log("  [PASS] HTTP context response contains validation requirements");
  console.log("  [PASS] HTTP context response contains no secrets");

  const getResponse = await getContextPackRoute(
    appUrl,
    httpPack.contextPackId,
    story.workspaceId,
    rawApiKey,
  );
  if (!getResponse.ok) {
    throw new Error(`GET context pack failed: ${getResponse.status}`);
  }
  const getPayload = (await getResponse.json()) as { text?: string };
  if (!getPayload.text?.includes("CONTEXT PACK")) {
    throw new Error("GET context pack missing formatted text");
  }

  let auditorBlocked = false;
  try {
    await auditorClient.mutation(api.contextPacks.create, {
      workspaceId: story.workspaceId,
      goal: "Auditor should be blocked",
    });
  } catch {
    auditorBlocked = true;
  }
  if (!auditorBlocked) {
    throw new Error("Expected auditor to be blocked from creating context packs");
  }
  console.log("  [PASS] Auditor blocked from create");

  await runCliContextSanity({
    appUrl,
    rawApiKey,
    workspaceId: story.workspaceId,
    projectId: story.projectId as Id<"projects">,
    workstreamId: story.workstreamId as Id<"workstreams">,
  });

  const mcpPackId = await runMcpContextSanity({
    appUrl,
    rawApiKey,
    workspaceId: story.workspaceId,
    projectId: story.projectId as Id<"projects">,
    workstreamId: story.workstreamId as Id<"workstreams">,
  });

  await assertUiRoutes(appUrl, CONTEXT_OWNER_EMAIL, httpPack.contextPackId);

  console.log("\nAll Sprint 33 agent context loop checks passed.");
  console.log(`CONTEXT_PACK_ID=${httpPack.contextPackId}`);
  console.log(`MCP_CONTEXT_PACK_ID=${mcpPackId}`);
  console.log(`MASKED_API_KEY=${maskApiKey(rawApiKey)}`);
  console.log(`HTTP_ROUTE=${appUrl}/cli/context/packs`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
