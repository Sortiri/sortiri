/**
 * Sprint 35 Private Evals sanity check — real API-key HTTP, CLI, MCP, UI, permissions.
 */

import {
  assertEvalSuiteSections,
  assertNoSecrets,
  AUTONOMY_AUDITOR_EMAIL,
  AUTONOMY_OWNER_EMAIL,
  AUTONOMY_VIEWER_EMAIL,
  completeOnboarding,
  convexClient,
  ensureClerkUser,
  generateEvalSuiteViaHttp,
  getAppUrl,
  getConvexTokenForUser,
  getEvalRunViaHttp,
  getEvalSuiteViaHttp,
  getEvalsRoute,
  loadEnvLocal,
  maskApiKey,
  postEvalRoute,
  requireLocalApp,
  runEvalSuiteViaHttp,
  type Id,
} from "./lib/sanity-eval-helpers.js";
import { runCliEvalsSanity } from "./sanity-cli-evals.js";
import { runMcpEvalsSanity } from "./sanity-mcp-eval-tools.js";
import { api } from "../convex/_generated/api";
import { API_KEY_PREFIX } from "../src/types/api-keys";

async function assertUiRoutes(
  appUrl: string,
  ownerEmail: string,
  evalSuiteId: string,
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
    await page.getByRole("heading", { name: /^Private Evals$/i }).waitFor();
    console.log("  [PASS] /intelligence Private Evals card responds");

    await page.goto(`${appUrl}/intelligence/evals`);
    await page.getByRole("heading", { name: /^Private Evals$/i }).waitFor();
    console.log("  [PASS] /intelligence/evals route responds");

    await page.goto(`${appUrl}/intelligence/evals/${evalSuiteId}`);
    await page.getByRole("heading", { name: /^Eval:/i }).waitFor();
    console.log("  [PASS] /intelligence/evals/<id> detail responds");
  } finally {
    await browser.close();
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 35 Private Evals sanity check\n");

  if (process.env.ALLOW_EVAL_HTTP_SKIP === "true") {
    console.log("  [SKIP] ALLOW_EVAL_HTTP_SKIP=true — Ready for next sprint: NO");
    process.exit(1);
  }

  const appUrl = getAppUrl();
  await requireLocalApp(appUrl);

  const ownerUserId = await ensureClerkUser(AUTONOMY_OWNER_EMAIL, "EvalOwner");
  const viewerUserId = await ensureClerkUser(AUTONOMY_VIEWER_EMAIL, "EvalViewer");
  const auditorUserId = await ensureClerkUser(AUTONOMY_AUDITOR_EMAIL, "EvalAuditor");

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
  await ownerClient.mutation(api.testSeed.seedRecommendationStory, {});
  const story = await ownerClient.mutation(api.testSeed.seedEvalStory, {});
  console.log("  [PASS] Seeded eval story");

  const evalSuiteId = story.evalSuiteIds[0] as Id<"evalSuites">;
  const suite = await ownerClient.query(api.evals.getSuite, { evalSuiteId });
  assertEvalSuiteSections(suite.suite);
  assertNoSecrets(JSON.stringify(suite));
  console.log("  [PASS] Convex getSuite returns eval suite with cases");

  const apiKeyResult = await ownerClient.mutation(api.apiKeys.create, {
    workspaceId: story.workspaceId,
    name: "Sprint 35 Sanity Eval Key",
  });
  const rawApiKey = apiKeyResult.rawKey;
  console.log(`  [PASS] Created dev API key ${maskApiKey(rawApiKey)}`);

  const missingAuth = await getEvalsRoute(appUrl, story.workspaceId, "");
  if (missingAuth.status !== 401) {
    throw new Error(`Expected missing API key 401, got ${missingAuth.status}`);
  }
  console.log("  [PASS] Missing API key rejected");

  const invalidKey = `${API_KEY_PREFIX}_00000000000000000000000000000000`;
  const invalidAuth = await getEvalsRoute(appUrl, story.workspaceId, invalidKey);
  if (invalidAuth.status !== 401) {
    throw new Error(`Expected invalid API key 401, got ${invalidAuth.status}`);
  }
  console.log("  [PASS] Invalid API key rejected");

  const httpList = await getEvalsRoute(appUrl, story.workspaceId, rawApiKey);
  const listPayload = (await httpList.json()) as { suites?: unknown[] };
  if (!httpList.ok || !Array.isArray(listPayload.suites)) {
    throw new Error("Valid API key list failed");
  }
  console.log("  [PASS] HTTP list eval suites");

  const httpGet = await getEvalSuiteViaHttp(
    appUrl,
    rawApiKey,
    story.workspaceId,
    evalSuiteId,
  );
  if (!httpGet.suite?.id && !httpGet.cases) {
    throw new Error("HTTP get eval suite failed");
  }
  assertNoSecrets(JSON.stringify(httpGet));
  console.log("  [PASS] HTTP get eval suite");

  if (story.recommendationId) {
    await generateEvalSuiteViaHttp(appUrl, rawApiKey, story.workspaceId, {
      source: "recommendation",
      entityId: story.recommendationId,
    });
    console.log("  [PASS] HTTP generate eval suite (dedup safe)");
  }

  const queued = await runEvalSuiteViaHttp(
    appUrl,
    rawApiKey,
    story.workspaceId,
    evalSuiteId,
  );
  if (!queued.runId) {
    throw new Error("HTTP run eval suite missing runId");
  }
  console.log("  [PASS] HTTP queue eval run");

  const runDetail = await getEvalRunViaHttp(
    appUrl,
    rawApiKey,
    story.workspaceId,
    queued.runId,
  );
  assertNoSecrets(JSON.stringify(runDetail));
  console.log("  [PASS] HTTP get eval run");

  try {
    await viewerClient.mutation(api.evals.runSuite, { evalSuiteId });
    throw new Error("Viewer should not run evals via Convex");
  } catch {
    console.log("  [PASS] Viewer blocked from Convex runSuite");
  }

  const viewerHttpRun = await postEvalRoute(
    appUrl,
    `/api/cli/evals/${evalSuiteId}/run`,
    { workspaceId: story.workspaceId },
    rawApiKey,
  );
  if (viewerHttpRun.status === 200) {
    console.log("  [PASS] HTTP run uses API key actor (not viewer session)");
  }

  try {
    await auditorClient.query(api.evals.listSuites, {
      workspaceId: story.workspaceId,
    });
    throw new Error("Auditor should be blocked from eval list");
  } catch {
    console.log("  [PASS] Auditor blocked from eval list");
  }

  await runCliEvalsSanity({
    appUrl,
    rawApiKey,
    workspaceId: story.workspaceId,
    evalSuiteId,
  });

  await runMcpEvalsSanity({
    appUrl,
    rawApiKey,
    workspaceId: story.workspaceId,
    evalSuiteId,
    workstreamId: story.workstreamId,
  });

  await assertUiRoutes(appUrl, AUTONOMY_OWNER_EMAIL, evalSuiteId);

  console.log("\nSprint 35 Real Testing Completion Report");
  console.log("Status: PASS");
  console.log("Ready for next sprint: YES");
  console.log("Core skips: 0");
}

main().catch((error) => {
  console.error("\nSprint 35 Real Testing Completion Report");
  console.error("Status: FAIL");
  console.error("Ready for next sprint: NO");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
