/**
 * Sprint 39 CLI decisions sanity.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type CliDecisionsSanityInput = {
  apiUrl: string;
  rawApiKey: string;
  workspaceId: string;
};

export async function runCliDecisionsSanity(input: CliDecisionsSanityInput): Promise<string> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-dec-cli-"));
  const configPath = path.join(tempDir, ".sortiri", "config.json");
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(
    configPath,
    `${JSON.stringify(
      {
        apiUrl: input.apiUrl,
        apiKey: input.rawApiKey,
        workspaceId: input.workspaceId,
        editor: "cursor",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const cliEntry = path.resolve("packages/cli/src/index.ts");
  const childEnv = { ...process.env };
  delete childEnv.SORTIRI_WORKSPACE_ID;
  delete childEnv.SORTIRI_API_KEY;
  delete childEnv.SORTIRI_API_URL;

  try {
    const recordOutput = execSync(
      `npx tsx ${cliEntry} decisions record --title "Sanity decision ${Date.now()}"`,
      {
        cwd: tempDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: childEnv,
      },
    );

    const listOutput = execSync(`npx tsx ${cliEntry} decisions list`, {
      cwd: tempDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnv,
    });

    if (!listOutput.includes("[")) {
      throw new Error("CLI decisions list did not return JSON array");
    }

    const idMatch = recordOutput.match(/"id"\s*:\s*"([^"]+)"/);
    if (!idMatch?.[1]) {
      throw new Error("CLI decisions record did not return decision id");
    }

    console.log("  [PASS] CLI decisions record/list");
    return idMatch[1];
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
