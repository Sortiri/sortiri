import type { Id } from "../../convex/_generated/dataModel";
import {
  assertNoSecrets,
  completeOnboarding,
  convexClient,
  ensureClerkUser,
  getAppUrl,
  getConvexTokenForUser,
  loadEnvLocal,
  maskApiKey,
  postContextRoute,
  requireLocalApp,
} from "./sanity-context-helpers.js";

export {
  AUTONOMY_AUDITOR_EMAIL,
  AUTONOMY_OWNER_EMAIL,
  AUTONOMY_VIEWER_EMAIL,
} from "./sanity-recommendation-helpers.js";

export type HttpEvalResponse = {
  suites?: Array<{ id: string; title: string; summary?: string; source?: string }>;
  suite?: { id: string; title: string; summary?: string };
  cases?: unknown[];
  recentRuns?: unknown[];
  suiteId?: string;
  created?: boolean;
  runId?: string;
  run?: { id: string; status?: string };
  results?: unknown[];
  error?: string;
};

export function assertEvalSuiteSections(suite: {
  title?: string;
  summary?: string;
}): void {
  if (!suite.title?.trim()) throw new Error("Eval suite missing title");
  if (!suite.summary?.trim()) throw new Error("Eval suite missing summary");
}

export async function getEvalsRoute(
  appUrl: string,
  workspaceId: string,
  rawKey: string,
  limit?: number,
): Promise<Response> {
  const params = new URLSearchParams({ workspaceId });
  if (limit !== undefined) params.set("limit", String(limit));
  return fetch(`${appUrl}/api/cli/evals?${params.toString()}`, {
    headers: { Authorization: `Bearer ${rawKey}` },
  });
}

export async function postEvalRoute(
  appUrl: string,
  route: string,
  body: Record<string, unknown>,
  rawKey?: string,
): Promise<Response> {
  return postContextRoute(appUrl, route, body, rawKey);
}

export async function getEvalSuiteViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  evalSuiteId: string,
): Promise<HttpEvalResponse> {
  const params = new URLSearchParams({ workspaceId });
  const response = await fetch(
    `${appUrl}/api/cli/evals/${evalSuiteId}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${rawKey}` } },
  );
  const payload = (await response.json().catch(() => null)) as HttpEvalResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP get eval suite failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export async function generateEvalSuiteViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  input: {
    source: "playbook" | "lesson" | "recommendation" | "context_pack" | "known_failure";
    entityId: string;
  },
): Promise<HttpEvalResponse> {
  const response = await postEvalRoute(
    appUrl,
    "/api/cli/evals/generate",
    { workspaceId, ...input },
    rawKey,
  );
  const payload = (await response.json().catch(() => null)) as HttpEvalResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP generate eval suite failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export async function runEvalSuiteViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  evalSuiteId: string,
): Promise<HttpEvalResponse> {
  const response = await postEvalRoute(
    appUrl,
    `/api/cli/evals/${evalSuiteId}/run`,
    { workspaceId },
    rawKey,
  );
  const payload = (await response.json().catch(() => null)) as HttpEvalResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP run eval suite failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export async function getEvalRunViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  evalRunId: string,
): Promise<HttpEvalResponse> {
  const params = new URLSearchParams({ workspaceId });
  const response = await fetch(
    `${appUrl}/api/cli/evals/runs/${evalRunId}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${rawKey}` } },
  );
  const payload = (await response.json().catch(() => null)) as HttpEvalResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP get eval run failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export {
  assertNoSecrets,
  completeOnboarding,
  convexClient,
  ensureClerkUser,
  getAppUrl,
  getConvexTokenForUser,
  loadEnvLocal,
  maskApiKey,
  requireLocalApp,
};

export type { Id };
