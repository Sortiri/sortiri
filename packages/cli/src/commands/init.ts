import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  clearSession,
  ensureEventsJournal,
  findRepoRoot,
  getConfigPath,
  saveConfig,
  type SortiriConfig,
} from "@sortiri/local";
import {
  ensureCursorSortiriRule,
  ensureGitignore,
  mergeCursorMcpConfig,
} from "../lib/cursorSetup.js";
import { detectRepoInfo } from "../lib/repo.js";

export type InitOptions = {
  apiUrl?: string;
  apiKey?: string;
  workspaceId?: string;
  projectId?: string;
  editor?: string;
  token?: string;
  yes?: boolean;
  local?: boolean;
  forceRules?: boolean;
};

const DEFAULTS = {
  apiUrl:
    process.env.SORTIRI_API_URL ??
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
    "http://127.0.0.1:3210",
  editor: "cursor",
};

type SetupConsumeResponse = {
  ok: true;
  apiUrl: string;
  apiKey: string;
  workspaceId: string;
  projectId: string | null;
  projectName: string;
};

async function prompt(
  rl: readline.Interface,
  label: string,
  defaultValue?: string,
  required = false,
): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = (await rl.question(`${label}${suffix}: `)).trim();
  if (answer) return answer;
  if (defaultValue !== undefined) return defaultValue;
  if (required) {
    console.error(`${label} is required.`);
    return prompt(rl, label, defaultValue, required);
  }
  return "";
}

async function consumeSetupToken(
  apiUrl: string,
  setupToken: string,
  repoRoot: string,
  editor: string,
): Promise<SetupConsumeResponse> {
  const repo = detectRepoInfo(repoRoot);
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/cli/setup/consume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      setupToken,
      repo: {
        name: repo.name,
        repositoryUrl: repo.repositoryUrl,
        localPath: repo.localPath,
        gitBranch: repo.gitBranch,
      },
      editor,
    }),
  });

  const payload = (await response.json()) as SetupConsumeResponse & { error?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? `Setup failed (${response.status})`);
  }
  return payload;
}

function printNextSteps(): void {
  console.log("\nNext steps:");
  console.log("  1. Run sortiri doctor");
  console.log("  2. Run sortiri dev");
  console.log("  3. Ask your agent to use the Sortiri rules");
}

async function runLocalInit(options: InitOptions, repoRoot: string): Promise<void> {
  const editor = options.editor ?? DEFAULTS.editor;

  const config: SortiriConfig = {
    mode: "local",
    editor,
    projectId: null,
  };

  saveConfig(config, repoRoot);
  clearSession(repoRoot);
  ensureEventsJournal(repoRoot, true);
  mergeCursorMcpConfig(repoRoot);
  ensureCursorSortiriRule(repoRoot, options.forceRules ?? false);
  ensureGitignore(repoRoot);

  console.log("\nSortiri initialized (local mode).");
  console.log(`Config: ${getConfigPath(repoRoot)}`);
  console.log("Timeline: .sortiri/events.jsonl");
  printNextSteps();
}

async function runTokenInit(
  options: InitOptions,
  repoRoot: string,
  rl: readline.Interface,
): Promise<void> {
  const apiUrl = options.apiUrl ?? DEFAULTS.apiUrl;
  const editor = options.editor ?? DEFAULTS.editor;
  let setupToken = options.token;

  if (!setupToken) {
    setupToken = await prompt(rl, "Paste Sortiri setup token", undefined, true);
  }

  console.log("\nConnecting to Sortiri...");
  const result = await consumeSetupToken(apiUrl, setupToken, repoRoot, editor);

  const config: SortiriConfig = {
    mode: "cloud",
    apiUrl: result.apiUrl || apiUrl,
    apiKey: result.apiKey,
    workspaceId: result.workspaceId,
    projectId: result.projectId,
    projectName: result.projectName,
    editor,
  };

  saveConfig(config, repoRoot);
  clearSession(repoRoot);
  ensureEventsJournal(repoRoot, true);
  mergeCursorMcpConfig(repoRoot);
  ensureCursorSortiriRule(repoRoot, options.forceRules ?? false);
  ensureGitignore(repoRoot);

  console.log("\nSortiri initialized.");
  console.log(`Config: ${getConfigPath(repoRoot)}`);
  console.log(`Project: ${result.projectName}`);
  printNextSteps();
}

async function runManualInit(
  options: InitOptions,
  repoRoot: string,
  rl: readline.Interface,
): Promise<void> {
  let apiUrl = options.apiUrl;
  let apiKey = options.apiKey;
  let workspaceId = options.workspaceId;
  let projectId = options.projectId;
  let editor = options.editor;

  if (options.yes) {
    apiUrl = apiUrl ?? DEFAULTS.apiUrl;
    editor = editor ?? DEFAULTS.editor;
    if (!apiKey) {
      throw new Error("--api-key is required with --yes for cloud manual setup");
    }
    if (!workspaceId) {
      throw new Error("--workspace-id is required with --yes for cloud manual setup");
    }
  } else {
    apiUrl = await prompt(rl, "Sortiri API URL", apiUrl ?? DEFAULTS.apiUrl);
    apiKey = await prompt(
      rl,
      "Sortiri API key (sk_sortiri_… from Sources)",
      apiKey,
      true,
    );
    workspaceId = await prompt(rl, "Workspace ID", workspaceId, true);
    projectId = await prompt(rl, "Project ID (optional)", projectId ?? "");
    editor = await prompt(rl, "Editor", editor ?? DEFAULTS.editor);
  }

  const config: SortiriConfig = {
    mode: "cloud",
    apiUrl: apiUrl!,
    apiKey: apiKey!,
    workspaceId: workspaceId!,
    projectId: projectId ? projectId : null,
    editor: editor ?? DEFAULTS.editor,
  };

  saveConfig(config, repoRoot);
  clearSession(repoRoot);
  ensureEventsJournal(repoRoot, true);
  mergeCursorMcpConfig(repoRoot);
  ensureCursorSortiriRule(repoRoot, options.forceRules ?? false);
  ensureGitignore(repoRoot);

  console.log("\nSortiri initialized (cloud config).");
  console.log(`Config: ${getConfigPath(repoRoot)}`);
  printNextSteps();
}

export async function runInit(options: InitOptions = {}): Promise<void> {
  const repoRoot = findRepoRoot();

  if (options.token) {
    const rl = readline.createInterface({ input, output });
    try {
      await runTokenInit(options, repoRoot, rl);
    } finally {
      rl.close();
    }
    return;
  }

  if (options.apiKey || options.workspaceId) {
    const rl = readline.createInterface({ input, output });
    try {
      await runManualInit(options, repoRoot, rl);
    } finally {
      rl.close();
    }
    return;
  }

  await runLocalInit(options, repoRoot);
}
