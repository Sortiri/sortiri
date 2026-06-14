import fs from "node:fs";
import path from "node:path";

const SORTIRI_RULE_CONTENT = `# Sortiri Timeline Rule

Use Sortiri to record meaningful work.

At the start of meaningful tasks, call \`start_workstream\`.

During tasks, call \`record_event\` when you:
- create a plan
- make a decision
- change code
- create or modify an important file
- find or fix an error
- complete a major step
- change direction

When useful output is created, call \`attach_artifact\`.

At the end of the task, call \`finish_workstream\`.

When running validation commands such as build, lint, tests, typecheck, or smoke tests, prefer using:

\`\`\`bash
sortiri run -- <command>
\`\`\`

Examples:

\`\`\`bash
sortiri run -- npm run build
sortiri run -- npm test
sortiri run -- npx tsc --noEmit
\`\`\`

This records command output, failures, and validation results into the current Sortiri workstream.

Keep event titles short and clear.
Use summaries to explain why the action mattered.
Do not record every tiny thought.
Record meaningful work history.
`;

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
      args: ["tsx", "packages/mcp/src/server.ts"],
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

export function ensureCursorSortiriRule(repoRoot: string): void {
  const rulesDir = path.join(repoRoot, ".cursor", "rules");
  const rulePath = path.join(rulesDir, "sortiri.mdc");

  if (fs.existsSync(rulePath)) {
    return;
  }

  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(rulePath, SORTIRI_RULE_CONTENT, "utf8");
}

export function ensureGitignore(repoRoot: string): void {
  const gitignorePath = path.join(repoRoot, ".gitignore");
  const entries = [".sortiri/config.json", ".sortiri/session.json", ".sortiri/"];

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `${entries.join("\n")}\n`, "utf8");
    return;
  }

  let contents = fs.readFileSync(gitignorePath, "utf8");
  for (const entry of entries) {
    if (contents.includes(entry) || contents.includes(".sortiri")) {
      continue;
    }
    const separator = contents.endsWith("\n") ? "" : "\n";
    contents = `${contents}${separator}${entry}\n`;
  }

  fs.writeFileSync(gitignorePath, contents, "utf8");
}
