import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCloudConfig as loadConfig } from "@sortiri/local";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export type EvalsCommandOptions = {
  subcommand?: string;
  id?: string;
  source?: string;
  entityId?: string;
  limit?: number;
  run?: string;
  suiteId?: string;
};

export async function runEvals(options: EvalsCommandOptions): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Sortiri is not initialized");
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  const subcommand = options.subcommand ?? "list";

  if (subcommand === "list") {
    const params = new URLSearchParams({ workspaceId: config.workspaceId });
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    const response = await fetch(`${config.apiUrl}/cli/evals?${params.toString()}`, {
      headers,
    });
    const payload = (await response.json().catch(() => null)) as
      | { suites?: unknown[]; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload?.suites ?? [], null, 2));
    return;
  }

  if (subcommand === "generate") {
    if (!options.source || !options.entityId) {
      console.error("--from-* source and entity id are required for generate");
      process.exit(1);
    }
    const response = await fetch(`${config.apiUrl}/cli/evals/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: config.workspaceId,
        source: options.source,
        entityId: options.entityId,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { suiteId?: string; created?: boolean; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (subcommand === "run") {
    if (!options.id) {
      console.error("suite id is required for run");
      process.exit(1);
    }

    await new Promise<void>((resolvePromise, reject) => {
      const child = spawn(
        "npx",
        ["tsx", "scripts/run-eval-suite.ts", "--suite", options.id!, "--api-key", config.apiKey, "--app-url", config.apiUrl, "--workspace-id", config.workspaceId],
        { cwd: repoRoot, stdio: "inherit", shell: true },
      );
      child.on("close", (code) => {
        if (code === 0) resolvePromise();
        else reject(new Error(`Eval runner exited with code ${code}`));
      });
      child.on("error", reject);
    });
    return;
  }

  if (subcommand === "get-run") {
    if (!options.id) {
      console.error("run id is required for get-run");
      process.exit(1);
    }
    const params = new URLSearchParams({ workspaceId: config.workspaceId });
    const response = await fetch(
      `${config.apiUrl}/cli/evals/runs/${options.id}?${params.toString()}`,
      { headers },
    );
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      console.error((payload?.error as string) ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (subcommand === "runs") {
    if (!options.id) {
      console.error("suite id is required for runs");
      process.exit(1);
    }
    const suite = await fetch(
      `${config.apiUrl}/cli/evals/${options.id}?workspaceId=${encodeURIComponent(config.workspaceId)}`,
      { headers },
    );
    const payload = (await suite.json().catch(() => null)) as
      | { recentRuns?: unknown[]; error?: string }
      | null;
    if (!suite.ok) {
      console.error(payload?.error ?? `Request failed with status ${suite.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload?.recentRuns ?? [], null, 2));
    return;
  }

  if (subcommand === "remediation-list") {
    const params = new URLSearchParams({ workspaceId: config.workspaceId });
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    const response = await fetch(`${config.apiUrl}/cli/evals/remediation?${params.toString()}`, {
      headers,
    });
    const payload = (await response.json().catch(() => null)) as
      | { remediations?: unknown[]; error?: string }
      | null;
    if (!response.ok) {
      console.error(payload?.error ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload?.remediations ?? [], null, 2));
    return;
  }

  if (subcommand === "remediation-generate") {
    const evalRunId = options.run ?? options.id;
    if (!evalRunId) {
      console.error("--run <evalRunId> is required for remediation generate");
      process.exit(1);
    }
    const response = await fetch(`${config.apiUrl}/cli/evals/remediation/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ workspaceId: config.workspaceId, evalRunId }),
    });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      console.error((payload?.error as string) ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (subcommand === "remediation-convert") {
    if (!options.id) {
      console.error("recommendation id is required for remediation convert");
      process.exit(1);
    }
    const response = await fetch(
      `${config.apiUrl}/cli/recommendations/${options.id}/convert`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ workspaceId: config.workspaceId }),
      },
    );
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      console.error((payload?.error as string) ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (subcommand === "remediation-rerun") {
    if (!options.id) {
      console.error("recommendation id is required for remediation rerun");
      process.exit(1);
    }
    const recResponse = await fetch(
      `${config.apiUrl}/cli/evals/remediation/${options.id}?workspaceId=${encodeURIComponent(config.workspaceId)}`,
      { headers },
    );
    const rec = (await recResponse.json().catch(() => null)) as
      | { evalSuiteId?: string; error?: string }
      | null;
    if (!recResponse.ok || !rec?.evalSuiteId) {
      console.error(rec?.error ?? "Failed to load remediation recommendation");
      process.exit(1);
    }
    const response = await fetch(`${config.apiUrl}/cli/evals/remediation/rerun`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: config.workspaceId,
        recommendationId: options.id,
        evalSuiteId: rec.evalSuiteId,
      }),
    });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      console.error((payload?.error as string) ?? `Request failed with status ${response.status}`);
      process.exit(1);
    }
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.error(`Unknown evals subcommand: ${subcommand}`);
  process.exit(1);
}
