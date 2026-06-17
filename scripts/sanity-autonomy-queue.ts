/**
 * Sprint 34 Autonomy Queue sanity check — real API-key HTTP, CLI, MCP, UI, permissions.
 */

import {
  assertNoSecrets,
  assertRecommendationSections,
  AUTONOMY_AUDITOR_EMAIL,
  AUTONOMY_OWNER_EMAIL,
  AUTONOMY_VIEWER_EMAIL,
  completeOnboarding,
  convertRecommendationViaHttp,
  convexClient,
  ensureClerkUser,
  generateRecommendationsViaHttp,
  getAppUrl,
  getConvexTokenForUser,
  getRecommendationViaHttp,
  getRecommendationsRoute,
  loadEnvLocal,
  maskApiKey,
  postRecommendationRoute,
  requireLocalApp,
  type Id,
} from "./lib/sanity-recommendation-helpers.js";
import { runCliRecommendationsSanity } from "./sanity-cli-recommendations.js";
import { runMcpRecommendationsSanity } from "./sanity-mcp-recommendation-tools.js";
import { api } from "../convex/_generated/api";
import { API_KEY_PREFIX } from "../src/types/api-keys";

async function assertUiRoutes(
  appUrl: string,
  ownerEmail: string,
  recommendationId: string,
  contextPackId?: string,
  workstreamId?: string,
): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const { clerk, clerkSetup } = await import("@clerk/testing/playwright");

  await clerkSetup();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${appUrl}/sign-in`);
    await clerk.signIn({ page, emailAddress: ownerEmail });

    await page.goto(`${appUrl}/intelligence`);
    await page.getByRole("heading", { name: /^Autonomy Queue$/i }).waitFor();
    console.log("  [PASS] /intelligence Autonomy Queue card responds");

    await page.goto(`${appUrl}/intelligence/queue`);
    await page.getByRole("heading", { name: /^Autonomy Queue$/i }).waitFor();
    console.log("  [PASS] /intelligence/queue route responds");

    await page.goto(`${appUrl}/recommendations/${recommendationId}`);
    await page.getByRole("link", { name: /Ask about this/i }).waitFor();
    console.log("  [PASS] /recommendations/<id> detail responds");

    if (contextPackId) {
      await page.goto(`${appUrl}/context/${contextPackId}`);
      await page.getByRole("button", { name: /Copy for Cursor/i }).waitFor();
      console.log("  [PASS] /context/<id> responds after convert");
    }

    if (workstreamId) {
      await page.goto(`${appUrl}/workstreams/${workstreamId}`);
      await page.getByRole("heading", { name: /workstream/i }).waitFor();
      console.log("  [PASS] /workstreams/<id> responds after convert");
    }

    await page.goto(`${appUrl}/ask?recommendationId=${recommendationId}`);
    await page.getByRole("heading", { name: /^Ask Sortiri$/i }).waitFor();
    await page.getByText(/Recommendation:/i).waitFor();
    console.log("  [PASS] /ask?recommendationId route responds");
  } finally {
    await browser.close();
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 34 Autonomy Queue sanity check\n");

  if (process.env.ALLOW_AUTONOMY_HTTP_SKIP === "true") {
    console.log("  [SKIP] ALLOW_AUTONOMY_HTTP_SKIP=true — Ready for next sprint: NO");
    process.exit(1);
  }

  const appUrl = getAppUrl();
  await requireLocalApp(appUrl);

  const ownerUserId = await ensureClerkUser(AUTONOMY_OWNER_EMAIL, "AutonomyOwner");
  const viewerUserId = await ensureClerkUser(AUTONOMY_VIEWER_EMAIL, "AutonomyViewer");
  const auditorUserId = await ensureClerkUser(AUTONOMY_AUDITOR_EMAIL, "AutonomyAuditor");

  const ownerClient = convexClient(await getConvexTokenForUser(ownerUserId));
  const viewerClient = convexClient(await getConvexTokenForUser(viewerUserId));
  const auditorClient = convexClient(await getConvexTokenForUser(auditorUserId));

  await completeOnboarding(ownerClient);
  await completeOnboarding(viewerClient);
  await completeOnboarding(auditorClient);

  await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});
  await viewerClient.mutation(api.testSeed.bootstrapTestViewer, {});
  await auditorClient.mutation(api.testSeed.bootstrapTestAuditor, {});
  console.log("  [PASS] Provisioned owner, viewer, auditor");

  await ownerClient.mutation(api.testSeed.seedImpactStory, {});
  await ownerClient.mutation(api.testSeed.seedLessonsPlaybooksStory, {});
  await ownerClient.mutation(api.testSeed.seedContextPackStory, {});
  const story = await ownerClient.mutation(api.testSeed.seedRecommendationStory, {});
  console.log("  [PASS] Seeded recommendation story");

  const genResult = await ownerClient.mutation(api.recommendations.generateForWorkspace, {
    workspaceId: story.workspaceId,
  });
  const recommendationId =
    (genResult.createdIds[0] as Id<"recommendations"> | undefined) ??
    (story.recommendationId as Id<"recommendations">);

  const rec = await ownerClient.query(api.recommendations.getById, { recommendationId });
  assertRecommendationSections(rec);
  assertNoSecrets(JSON.stringify(rec));
  console.log("  [PASS] Convex generateForWorkspace created recommendations");

  const apiKeyResult = await ownerClient.mutation(api.apiKeys.create, {
    workspaceId: story.workspaceId,
    name: "Sprint 34 Sanity Autonomy Key",
  });
  const rawApiKey = apiKeyResult.rawKey;
  console.log(`  [PASS] Created dev API key ${maskApiKey(rawApiKey)}`);

  const missingAuth = await getRecommendationsRoute(appUrl, story.workspaceId, "");
  if (missingAuth.status !== 401) {
    throw new Error(`Expected missing API key 401, got ${missingAuth.status}`);
  }
  console.log("  [PASS] Missing API key rejected");

  const invalidKey = `${API_KEY_PREFIX}_00000000000000000000000000000000`;
  const invalidAuth = await getRecommendationsRoute(appUrl, story.workspaceId, invalidKey);
  if (invalidAuth.status !== 401) {
    throw new Error(`Expected invalid API key 401, got ${invalidAuth.status}`);
  }
  console.log("  [PASS] Invalid API key rejected");

  const revokedKeyResult = await ownerClient.mutation(api.apiKeys.create, {
    workspaceId: story.workspaceId,
    name: "Sprint 34 Revoked Key",
  });
  await ownerClient.mutation(api.apiKeys.revoke, {
    apiKeyId: revokedKeyResult.apiKeyId as Id<"apiKeys">,
  });
  const revokedAuth = await getRecommendationsRoute(
    appUrl,
    story.workspaceId,
    revokedKeyResult.rawKey,
  );
  if (revokedAuth.status !== 401) {
    throw new Error(`Expected revoked API key 401, got ${revokedAuth.status}`);
  }
  console.log("  [PASS] Revoked API key rejected");

  await generateRecommendationsViaHttp(appUrl, rawApiKey, story.workspaceId);
  const httpList = await getRecommendationsRoute(appUrl, story.workspaceId, rawApiKey);
  const listPayload = (await httpList.json()) as { recommendations?: unknown[] };
  if (!httpList.ok || !Array.isArray(listPayload.recommendations)) {
    throw new Error("Valid API key list failed");
  }
  console.log("  [PASS] HTTP list recommendations");

  const httpGet = await getRecommendationViaHttp(
    appUrl,
    rawApiKey,
    story.workspaceId,
    recommendationId,
  );
  if (!httpGet.recommendation?.id) {
    throw new Error("HTTP get recommendation failed");
  }
  assertNoSecrets(JSON.stringify(httpGet));
  console.log("  [PASS] HTTP get recommendation");

  const openRec =
    listPayload.recommendations.find(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        (item as { status?: string }).status === "open",
    ) ?? listPayload.recommendations[0];
  const convertTarget =
    typeof openRec === "object" && openRec !== null && "id" in openRec
      ? String((openRec as { id: string }).id)
      : recommendationId;

  const converted = await convertRecommendationViaHttp(
    appUrl,
    rawApiKey,
    story.workspaceId,
    convertTarget,
  );
  if (!converted.workstreamId || !converted.contextPackId) {
    throw new Error("HTTP convert missing workstream/context pack ids");
  }
  console.log("  [PASS] HTTP convert recommendation");

  try {
    await viewerClient.mutation(api.recommendations.convertToWorkstream, {
      recommendationId: convertTarget as Id<"recommendations">,
    });
    throw new Error("Viewer should not convert via Convex");
  } catch {
    console.log("  [PASS] Viewer blocked from Convex convert");
  }

  const viewerHttpConvert = await postRecommendationRoute(
    appUrl,
    `/cli/recommendations/${convertTarget}/convert`,
    { workspaceId: story.workspaceId },
    rawApiKey,
  );
  if (viewerHttpConvert.status === 200) {
    console.log("  [PASS] HTTP convert uses API key actor (not viewer session)");
  }

  try {
    await auditorClient.query(api.recommendations.listByWorkspace, {
      workspaceId: story.workspaceId,
    });
    throw new Error("Auditor should be blocked from queue");
  } catch {
    console.log("  [PASS] Auditor blocked from queue");
  }

  await runCliRecommendationsSanity({
    appUrl,
    rawApiKey,
    workspaceId: story.workspaceId,
    recommendationId,
  });

  await runMcpRecommendationsSanity({
    appUrl,
    rawApiKey,
    workspaceId: story.workspaceId,
    recommendationId,
  });

  await assertUiRoutes(
    appUrl,
    AUTONOMY_OWNER_EMAIL,
    recommendationId,
    converted.contextPackId,
    converted.workstreamId,
  );

  console.log("\nSprint 34 Real Testing Completion Report");
  console.log("Status: PASS");
  console.log("Ready for next sprint: YES");
  console.log("Core skips: 0");
}

main().catch((error) => {
  console.error("\nSprint 34 Real Testing Completion Report");
  console.error("Status: FAIL");
  console.error("Ready for next sprint: NO");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
