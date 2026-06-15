/**
 * Sprint 35 CLI evals sanity.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertNoSecrets, getAppUrl, maskApiKey } from "./lib/sanity-eval-helpers.js";

export type CliEvalsSanityInput = {
  appUrl: string;
  rawApiKey: string;
  workspaceId: string;
  evalSuiteId: string;
};

export async function runCliEvalsSanity(input: CliEvalsSanityInput): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-eval-cli-"));
  const configPath = path.join(tempDir, ".sortiri", "config.json");
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(
    configPath,
    `${JSON.stringify(
      {
        apiUrl: input.appUrl,
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
    const listOutput = execSync(`npx tsx ${cliEntry} evals list`, {
      cwd: tempDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnv,
    });
    assertNoSecrets(listOutput);
    if (!listOutput.includes("[")) {
      throw new Error("CLI evals list did not return JSON array");
    }

    const getOutput = execSync(
      `npx tsx ${cliEntry} evals runs ${JSON.stringify(input.evalSuiteId)}`,
      {
        cwd: tempDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: childEnv,
      },
    );
    assertNoSecrets(getOutput);
    if (!getOutput.includes("[")) {
      throw new Error("CLI evals runs did not return JSON array");
    }

    console.log(`  [PASS] CLI evals list/runs (${maskApiKey(input.rawApiKey)})`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const appUrl = getAppUrl();
  console.log("Run sanity:private-evals for full CLI eval sanity with seeded data.");
  console.log(`App URL: ${appUrl}`);
}
