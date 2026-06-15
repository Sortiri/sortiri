import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "@sortiri/local";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export type EvalsCommandOptions = {
  subcommand?: string;
  id?: string;
  source?: string;
  entityId?: string;
  limit?: number;
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
    const response = await fetch(`${config.apiUrl}/api/cli/evals?${params.toString()}`, {
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
    const response = await fetch(`${config.apiUrl}/api/cli/evals/generate`, {
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
      `${config.apiUrl}/api/cli/evals/runs/${options.id}?${params.toString()}`,
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
      `${config.apiUrl}/api/cli/evals/${options.id}?workspaceId=${encodeURIComponent(config.workspaceId)}`,
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

  console.error(`Unknown evals subcommand: ${subcommand}`);
  process.exit(1);
}
