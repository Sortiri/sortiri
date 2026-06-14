import fs from "node:fs";
import path from "node:path";
import {
  findRepoRoot,
  getConfigPath,
  loadConfig,
  loadSession,
  saveSession,
} from "@sortiri/local";
import { startWatcher } from "../watcher.js";

export type DoctorOptions = {
  record?: boolean;
};

const DOCTOR_DEBOUNCE_MS = 5 * 60 * 1000;

type CheckResult = {
  label: string;
  ok: boolean;
  detail?: string;
};

function printCheck(result: CheckResult): void {
  const icon = result.ok ? "✓" : "✕";
  console.log(`${icon} ${result.label}${result.detail ? ` — ${result.detail}` : ""}`);
}

async function checkHealth(
  apiUrl: string,
  apiKey: string,
  projectId?: string | null,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const url = new URL(`${apiUrl.replace(/\/$/, "")}/api/cli/health`);
  if (projectId) {
    url.searchParams.set("projectId", projectId);
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    results.push({ label: "API key valid", ok: false, detail: `HTTP ${response.status}` });
    return results;
  }

  const payload = (await response.json()) as {
    ok?: boolean;
    workspaceId?: string;
    workspaceName?: string;
  };

  results.push({ label: "API key valid", ok: true });
  results.push({
    label: "Workspace connected",
    ok: Boolean(payload.workspaceId),
    detail: payload.workspaceName,
  });

  if (projectId) {
    results.push({ label: "Project connected", ok: response.status === 200 });
  }

  return results;
}

async function recordDoctorEvent(
  apiUrl: string,
  apiKey: string,
  projectId?: string | null,
): Promise<CheckResult> {
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/ingest/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "system",
      category: "system_event",
      type: "cli.doctor_passed",
      actor: { type: "system", name: "Sortiri CLI" },
      title: "Sortiri doctor passed",
      summary:
        "Local Sortiri config, API key, MCP config, and watcher setup were validated.",
      projectId: projectId ?? undefined,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    return {
      label: "Test event recorded",
      ok: false,
      detail: payload.error ?? `HTTP ${response.status}`,
    };
  }

  return { label: "Test event recorded", ok: true };
}

function checkWatcherCanStart(): CheckResult {
  try {
    const config = loadConfig();
    const watcher = startWatcher(config);
    watcher.close();
    return { label: "Watcher can start", ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { label: "Watcher can start", ok: false, detail: message };
  }
}

export async function runDoctor(options: DoctorOptions = {}): Promise<void> {
  console.log("Sortiri Doctor\n");

  const repoRoot = findRepoRoot();
  const results: CheckResult[] = [];

  const configPath = getConfigPath(repoRoot);
  results.push({
    label: "Config found",
    ok: fs.existsSync(configPath),
    detail: configPath,
  });

  if (!fs.existsSync(configPath)) {
    for (const result of results) printCheck(result);
    console.log("\nRun `npx sortiri init` again or create a new setup token.");
    process.exit(1);
  }

  let config;
  try {
    config = loadConfig(repoRoot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ label: "Config valid", ok: false, detail: message });
    for (const result of results) printCheck(result);
    process.exit(1);
  }

  results.push({
    label: "API key present",
    ok: Boolean(config.apiKey),
  });

  if (config.projectId) {
    results.push({
      label: "Project connected",
      ok: true,
      detail: config.projectName ?? config.projectId,
    });
  } else {
    results.push({
      label: "No project connected",
      ok: false,
      detail: "Run sortiri init again to register this repo.",
    });
  }

  const mcpPath = path.join(repoRoot, ".cursor", "mcp.json");
  let mcpOk = false;
  if (fs.existsSync(mcpPath)) {
    try {
      const mcp = JSON.parse(fs.readFileSync(mcpPath, "utf8")) as {
        mcpServers?: Record<string, unknown>;
      };
      mcpOk = Boolean(mcp.mcpServers?.sortiri);
    } catch {
      mcpOk = false;
    }
  }
  results.push({ label: "Cursor MCP config found", ok: mcpOk });

  const rulePath = path.join(repoRoot, ".cursor", "rules", "sortiri.mdc");
  results.push({ label: "Cursor rule found", ok: fs.existsSync(rulePath) });

  const healthChecks = await checkHealth(config.apiUrl, config.apiKey, config.projectId);
  results.push(...healthChecks);

  results.push(checkWatcherCanStart());

  const session = loadSession(repoRoot);
  const shouldRecord =
    options.record !== false &&
    (!session.lastDoctorAt || Date.now() - session.lastDoctorAt > DOCTOR_DEBOUNCE_MS);

  if (shouldRecord) {
    const eventCheck = await recordDoctorEvent(
      config.apiUrl,
      config.apiKey,
      config.projectId,
    );
    results.push(eventCheck);
    if (eventCheck.ok) {
      saveSession({ ...session, lastDoctorAt: Date.now() }, repoRoot);
    }
  } else {
    results.push({ label: "Test event recorded", ok: true, detail: "skipped (debounced)" });
  }

  for (const result of results) {
    printCheck(result);
  }

  const failed = results.some((r) => !r.ok);
  if (failed) {
    console.log("\nRun `npx sortiri init` again or create a new setup token.");
    process.exit(1);
  }

  console.log("\nYour Sortiri project is ready.");
}
