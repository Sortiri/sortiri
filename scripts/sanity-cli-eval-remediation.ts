/**
 * Sprint 36 CLI eval remediation sanity.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertNoSecrets, getAppUrl, maskApiKey } from "./lib/sanity-eval-helpers.js";

export type CliEvalRemediationSanityInput = {
  appUrl: string;
  rawApiKey: string;
  workspaceId: string;
  failedEvalRunId: string;
  remediationRecommendationId: string;
};

export async function runCliEvalRemediationSanity(
  input: CliEvalRemediationSanityInput,
): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-eval-remediation-cli-"));
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
    const listOutput = execSync(`npx tsx ${cliEntry} evals remediation list`, {
      cwd: tempDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnv,
    });
    assertNoSecrets(listOutput);

    const generateOutput = execSync(
      `npx tsx ${cliEntry} evals remediation generate --run ${JSON.stringify(input.failedEvalRunId)}`,
      {
        cwd: tempDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: childEnv,
      },
    );
    assertNoSecrets(generateOutput);

    const convertOutput = execSync(
      `npx tsx ${cliEntry} evals remediation convert ${JSON.stringify(input.remediationRecommendationId)}`,
      {
        cwd: tempDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: childEnv,
      },
    );
    assertNoSecrets(convertOutput);

    console.log(`  [PASS] CLI eval remediation flow (${maskApiKey(input.rawApiKey)})`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
