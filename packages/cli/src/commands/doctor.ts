import fs from "node:fs";
import path from "node:path";
import {
  appendEvent,
  findRepoRoot,
  getConfigPath,
  getEventsPath,
  isLocalMode,
  loadConfig,
  loadSession,
  saveSession,
} from "@sortiri/local";
import { canStartLocalViewer } from "../localViewer.js";
import { startWatcher } from "../watcher.js";

export type DoctorOptions = {
  record?: boolean;
};

const DOCTOR_DEBOUNCE_MS = 5 * 60 * 1000;

type CheckResult = {
  label: string;
  ok: boolean;
  detail?: string;
  optional?: boolean;
};

function printCheck(result: CheckResult): void {
  const icon = result.ok ? "✓" : result.optional ? "○" : "✕";
  const suffix = result.optional && !result.ok ? " (optional)" : "";
  console.log(`${icon} ${result.label}${result.detail ? ` — ${result.detail}` : ""}${suffix}`);
}

async function checkHealth(
  apiUrl: string,
  apiKey: string,
  projectId?: string | null,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const url = new URL(`${apiUrl.replace(/\/$/, "")}/cli/health`);
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

  results.push({
    label: "Convex HTTP URL configured",
    ok: !/\/api(\/|$)/.test(apiUrl),
    detail: apiUrl,
  });

  return results;
}

async function recordDoctorCloudEvent(
  apiUrl: string,
  apiKey: string,
  projectId?: string | null,
): Promise<CheckResult> {
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/ingest/events`, {
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
      label: "Test event recorded (cloud)",
      ok: false,
      detail: payload.error ?? `HTTP ${response.status}`,
    };
  }

  return { label: "Test event recorded (cloud)", ok: true };
}

function recordDoctorLocalEvent(repoRoot: string): CheckResult {
  try {
    appendEvent(
      {
        source: "system",
        type: "validation.passed",
        title: "Sortiri doctor passed",
        summary: "Local config, journal, MCP config, and timeline viewer validated.",
        actor: { type: "system", name: "Sortiri CLI" },
      },
      repoRoot,
    );
    return { label: "Test event recorded (local)", ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { label: "Test event recorded (local)", ok: false, detail: message };
  }
}

function checkWatcherCanStart(): CheckResult {
  try {
    const config = loadConfig();
    if (isLocalMode(config)) {
      return { label: "Watcher can start", ok: true, detail: "skipped (local mode)", optional: true };
    }
    const watcher = startWatcher(config);
    watcher.close();
    return { label: "Watcher can start", ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { label: "Watcher can start", ok: false, detail: message, optional: true };
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
    console.log("\nRun `npx sortiri init --yes` to initialize local mode.");
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

  const local = isLocalMode(config);
  results.push({
    label: "Mode",
    ok: true,
    detail: local ? "local" : "cloud",
  });

  results.push({
    label: "Events journal exists",
    ok: fs.existsSync(getEventsPath(repoRoot)),
    detail: getEventsPath(repoRoot),
  });

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

  results.push({
    label: "Local timeline viewer ready",
    ok: canStartLocalViewer(),
  });

  if (local) {
    if (config.apiKey) {
      results.push({
        label: "Cloud API key present",
        ok: true,
        detail: "optional cloud credentials detected",
        optional: true,
      });
    } else {
      results.push({
        label: "Cloud credentials",
        ok: true,
        detail: "skipped (local mode)",
        optional: true,
      });
    }
  } else {
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

    if (config.apiUrl && config.apiKey) {
      const healthChecks = await checkHealth(config.apiUrl, config.apiKey, config.projectId);
      results.push(...healthChecks);
    }

    results.push(checkWatcherCanStart());
  }

  const session = loadSession(repoRoot);
  const shouldRecord =
    options.record !== false &&
    (!session.lastDoctorAt || Date.now() - session.lastDoctorAt > DOCTOR_DEBOUNCE_MS);

  if (shouldRecord) {
    if (local) {
      results.push(recordDoctorLocalEvent(repoRoot));
    } else if (config.apiUrl && config.apiKey) {
      const eventCheck = await recordDoctorCloudEvent(
        config.apiUrl,
        config.apiKey,
        config.projectId,
      );
      results.push(eventCheck);
    }
    if (results.some((r) => r.label.startsWith("Test event recorded") && r.ok)) {
      saveSession({ ...session, lastDoctorAt: Date.now() }, repoRoot);
    }
  } else {
    results.push({
      label: "Test event recorded",
      ok: true,
      detail: "skipped (debounced)",
      optional: true,
    });
  }

  for (const result of results) {
    printCheck(result);
  }

  const failed = results.some((r) => !r.ok && !r.optional);
  if (failed) {
    console.log("\nRun `npx sortiri init --yes` or fix the issues above.");
    process.exit(1);
  }

  console.log("\nYour Sortiri project is ready.");
}
