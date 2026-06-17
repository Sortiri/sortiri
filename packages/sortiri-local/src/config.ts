import fs from "node:fs";
import path from "node:path";
import { getConfigPath, getSortiriDir } from "./paths.js";
import {
  asCloudConfig,
  isCloudMode,
  sortiriConfigSchema,
  type CloudSortiriConfig,
  type SortiriConfig,
} from "./types.js";
import { clearSession } from "./session.js";

function normalizeApiUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function readConfigFile(configPath: string): Partial<SortiriConfig> {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const raw = JSON.parse(fs.readFileSync(configPath, "utf8")) as unknown;
  const parsed = sortiriConfigSchema.partial().safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid Sortiri config at ${configPath}`);
  }
  return parsed.data;
}

function envConfig(): Partial<SortiriConfig> {
  const config: Partial<SortiriConfig> = {};

  const mode = process.env.SORTIRI_MODE?.trim();
  const apiUrl = process.env.SORTIRI_API_URL?.trim();
  const apiKey = process.env.SORTIRI_API_KEY?.trim();
  const workspaceId = process.env.SORTIRI_WORKSPACE_ID?.trim();
  const projectId = process.env.SORTIRI_PROJECT_ID?.trim();

  if (mode === "local" || mode === "cloud") config.mode = mode;
  if (apiUrl) config.apiUrl = apiUrl;
  if (apiKey) config.apiKey = apiKey;
  if (workspaceId) config.workspaceId = workspaceId;
  if (projectId) config.projectId = projectId;

  return config;
}

function mergeConfig(fromEnv: Partial<SortiriConfig>, fromFile: Partial<SortiriConfig>): SortiriConfig {
  const merged: SortiriConfig = sortiriConfigSchema.parse({
    mode: fromEnv.mode ?? fromFile.mode ?? "local",
    apiUrl: fromEnv.apiUrl ?? fromFile.apiUrl,
    apiKey: fromEnv.apiKey ?? fromFile.apiKey,
    workspaceId: fromEnv.workspaceId ?? fromFile.workspaceId,
    projectId:
      fromEnv.projectId !== undefined ? fromEnv.projectId : fromFile.projectId ?? null,
    projectName: fromFile.projectName,
    editor: fromFile.editor,
  });

  // Legacy configs without mode but with cloud credentials
  if (!fromFile.mode && !fromEnv.mode && merged.apiKey && merged.workspaceId) {
    merged.mode = "cloud";
  }

  if (merged.apiUrl) {
    merged.apiUrl = normalizeApiUrl(merged.apiUrl);
  }

  return merged;
}

export function loadConfig(cwd?: string): SortiriConfig {
  const fromEnv = envConfig();
  const fromFile = readConfigFile(getConfigPath(cwd));
  const merged = mergeConfig(fromEnv, fromFile);

  if (isCloudMode(merged)) {
    if (!merged.apiUrl || !merged.apiKey || !merged.workspaceId) {
      throw new Error(
        "Missing required Sortiri cloud config. Set SORTIRI_API_URL, SORTIRI_API_KEY, and SORTIRI_WORKSPACE_ID, or run sortiri init.",
      );
    }
    return sortiriConfigSchema.parse({
      ...merged,
      mode: "cloud",
      apiUrl: normalizeApiUrl(merged.apiUrl),
      projectId: merged.projectId ?? null,
    });
  }

  return sortiriConfigSchema.parse({
    ...merged,
    mode: "local",
    projectId: merged.projectId ?? null,
  });
}

export function loadCloudConfig(cwd?: string): CloudSortiriConfig {
  return asCloudConfig(loadConfig(cwd));
}

export function tryLoadConfig(cwd?: string): SortiriConfig | null {
  try {
    return loadConfig(cwd);
  } catch {
    return null;
  }
}

export function saveConfig(config: SortiriConfig, cwd?: string): void {
  const sortiriDir = getSortiriDir(cwd);
  fs.mkdirSync(sortiriDir, { recursive: true });

  const configPath = getConfigPath(cwd);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });

  const payload: SortiriConfig = {
    ...config,
    apiUrl: config.apiUrl ? normalizeApiUrl(config.apiUrl) : config.apiUrl,
    projectId: config.projectId ?? null,
  };

  fs.writeFileSync(configPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function ensureConfig(cwd?: string): void {
  const sortiriDir = getSortiriDir(cwd);
  fs.mkdirSync(sortiriDir, { recursive: true });

  const configPath = getConfigPath(cwd);
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Sortiri config not found at ${configPath}. Run sortiri init first.`,
    );
  }

  const sessionPath = path.join(path.dirname(configPath), "session.json");
  if (!fs.existsSync(sessionPath)) {
    clearSession(cwd);
  }
}
