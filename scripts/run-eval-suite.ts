#!/usr/bin/env node
/**
 * Local eval suite runner — executes cases and writes results via eval ingest HTTP routes.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "@sortiri/local";
import { executeEvalCase, type EvalCaseInput } from "./lib/eval-case-executors.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

type CliArgs = {
  suiteId: string;
  runId?: string;
  apiKey?: string;
  appUrl?: string;
  workspaceId?: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { suiteId: "" };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--suite" && argv[i + 1]) {
      args.suiteId = argv[++i]!;
    } else if (arg === "--run" && argv[i + 1]) {
      args.runId = argv[++i];
    } else if (arg === "--api-key" && argv[i + 1]) {
      args.apiKey = argv[++i];
    } else if (arg === "--app-url" && argv[i + 1]) {
      args.appUrl = argv[++i];
    } else if (arg === "--workspace-id" && argv[i + 1]) {
      args.workspaceId = argv[++i];
    }
  }

  if (!args.suiteId) {
    throw new Error("Usage: npx tsx scripts/run-eval-suite.ts --suite <evalSuiteId> [--run <runId>]");
  }

  return args;
}

async function postJson(
  appUrl: string,
  path: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(`${appUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed: ${response.status} ${path}`);
  }
  return payload;
}

async function getJson(
  appUrl: string,
  path: string,
  apiKey: string,
): Promise<unknown> {
  const response = await fetch(`${appUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed: ${response.status} ${path}`);
  }
  return payload;
}

async function main() {
  const cliArgs = parseArgs(process.argv);
  const config = loadConfig();
  const appUrl = cliArgs.appUrl ?? config.apiUrl;
  const apiKey = cliArgs.apiKey ?? config.apiKey;
  const workspaceId = cliArgs.workspaceId ?? config.workspaceId;

  const suitePayload = (await getJson(
    appUrl,
    `/api/cli/evals/${cliArgs.suiteId}?workspaceId=${encodeURIComponent(workspaceId)}`,
    apiKey,
  )) as {
    suite?: { title?: string };
    cases?: EvalCaseInput[];
  };

  const cases = (suitePayload.cases ?? []).map((item) => ({
    ...item,
    config: item.config ?? {},
  }));

  let runId = cliArgs.runId;
  if (!runId) {
    const runPayload = (await postJson(appUrl, `/api/cli/evals/${cliArgs.suiteId}/run`, apiKey, {
      workspaceId,
    })) as { runId?: string };
    runId = runPayload.runId;
  }

  if (!runId) {
    throw new Error("Failed to create eval run");
  }

  await postJson(appUrl, `/api/cli/evals/runs/${runId}/mark-running`, apiKey, { workspaceId });

  const executorCtx = {
    appUrl,
    apiKey,
    workspaceId,
    repoRoot,
    suiteTitle: suitePayload.suite?.title,
  };

  for (const evalCase of cases) {
    const startedAt = Date.now();
    const result = await executeEvalCase(evalCase, executorCtx);
    const completedAt = Date.now();

    await postJson(appUrl, `/api/cli/evals/runs/${runId}/results`, apiKey, {
      workspaceId,
      evalCaseId: evalCase.id,
      status: result.status,
      title: evalCase.title,
      summary: result.summary,
      output: result.output,
      error: result.error,
      startedAt,
      completedAt,
    });

    console.log(`[${result.status.toUpperCase()}] ${evalCase.title}`);
  }

  const finalized = (await postJson(appUrl, `/api/cli/evals/runs/${runId}/finalize`, apiKey, {
    workspaceId,
  })) as {
    run?: { status?: string; summary?: string };
    results?: Array<{ status: string }>;
  };

  const status = finalized.run?.status ?? "unknown";
  console.log(`\nEval run ${runId}: ${status}`);
  console.log(finalized.run?.summary ?? "");

  if (status === "failed" || status === "error") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
