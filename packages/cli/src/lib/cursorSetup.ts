import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RULE_RELATIVE = path.join("packages", "agent-rules", "cursor", "sortiri.mdc");

const RULE_CANDIDATES = [
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../templates/sortiri.mdc"),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../agent-rules/cursor/sortiri.mdc"),
];

export function getSortiriRuleContent(): string {
  for (const candidate of RULE_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, "utf8");
    }
  }
  return "# Sortiri\n\nRecord meaningful agent work with Sortiri MCP tools and `sortiri record`.\n";
}

export function mergeCursorMcpConfig(repoRoot: string): void {
  const cursorDir = path.join(repoRoot, ".cursor");
  const mcpPath = path.join(cursorDir, "mcp.json");

  fs.mkdirSync(cursorDir, { recursive: true });

  let existing: { mcpServers?: Record<string, unknown> } = { mcpServers: {} };
  if (fs.existsSync(mcpPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(mcpPath, "utf8")) as {
        mcpServers?: Record<string, unknown>;
      };
    } catch {
      console.warn("Could not parse existing .cursor/mcp.json — overwriting sortiri entry only.");
    }
  }

  const mcpServers = {
    ...(existing.mcpServers ?? {}),
    sortiri: {
      command: "npx",
      args: ["sortiri", "mcp"],
      env: {
        SORTIRI_CONFIG_PATH: ".sortiri/config.json",
      },
    },
  };

  fs.writeFileSync(
    mcpPath,
    `${JSON.stringify({ mcpServers }, null, 2)}\n`,
    "utf8",
  );
}

export function ensureCursorSortiriRule(repoRoot: string, force = false): void {
  const rulesDir = path.join(repoRoot, ".cursor", "rules");
  const rulePath = path.join(rulesDir, "sortiri.mdc");

  if (fs.existsSync(rulePath) && !force) {
    return;
  }

  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(rulePath, getSortiriRuleContent(), "utf8");
}

export function ensureGitignore(repoRoot: string): void {
  const gitignorePath = path.join(repoRoot, ".gitignore");
  const entries = [".sortiri/config.json", ".sortiri/session.json"];

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `${entries.join("\n")}\n`, "utf8");
    return;
  }

  let contents = fs.readFileSync(gitignorePath, "utf8");
  for (const entry of entries) {
    if (contents.includes(entry)) {
      continue;
    }
    const separator = contents.endsWith("\n") ? "" : "\n";
    contents = `${contents}${separator}${entry}\n`;
  }

  fs.writeFileSync(gitignorePath, contents, "utf8");
}

export { RULE_RELATIVE };
