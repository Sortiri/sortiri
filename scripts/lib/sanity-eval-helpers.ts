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
  return fetch(`${appUrl}/cli/evals?${params.toString()}`, {
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
    `${appUrl}/cli/evals/${evalSuiteId}?${params.toString()}`,
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
    "/cli/evals/generate",
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
    `/cli/evals/${evalSuiteId}/run`,
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
    `${appUrl}/cli/evals/runs/${evalRunId}?${params.toString()}`,
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

export async function postRemediationGenerateViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  evalRunId: string,
): Promise<{ recommendationIds?: string[]; count?: number }> {
  const response = await postEvalRoute(
    appUrl,
    "/cli/evals/remediation/generate",
    { workspaceId, evalRunId },
    rawKey,
  );
  const payload = (await response.json().catch(() => null)) as
    | { recommendationIds?: string[]; count?: number; error?: string }
    | null;
  if (!response.ok) {
    throw new Error(
      `HTTP generate remediation failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}

export async function getRemediationViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  recommendationId: string,
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ workspaceId });
  const response = await fetch(
    `${appUrl}/cli/evals/remediation/${recommendationId}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${rawKey}` } },
  );
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    throw new Error(`HTTP get remediation failed: ${response.status}`);
  }
  return payload ?? {};
}

export async function executeEvalSuiteLocally(input: {
  appUrl: string;
  rawApiKey: string;
  workspaceId: string;
  evalSuiteId: string;
  runId?: string;
}): Promise<{ exitCode: number; output: string }> {
  const { spawnSync } = await import("node:child_process");
  const args = [
    "tsx",
    "scripts/run-eval-suite.ts",
    "--suite",
    input.evalSuiteId,
    "--api-key",
    input.rawApiKey,
    "--app-url",
    input.appUrl,
    "--workspace-id",
    input.workspaceId,
  ];
  if (input.runId) {
    args.push("--run", input.runId);
  }

  const result = spawnSync("npx", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
    env: {
      ...process.env,
      SORTIRI_API_URL: input.appUrl,
      SORTIRI_API_KEY: input.rawApiKey,
      SORTIRI_WORKSPACE_ID: input.workspaceId,
    },
  });

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  const exitCode = result.status ?? 1;

  if (exitCode !== 0 && exitCode !== 1) {
    throw new Error(output || `Eval runner exited with code ${exitCode}`);
  }

  return { exitCode, output };
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
