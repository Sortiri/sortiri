/**
 * Sprint 34 CLI recommendations sanity.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertNoSecrets, getAppUrl, maskApiKey } from "./lib/sanity-recommendation-helpers.js";

export type CliRecommendationsSanityInput = {
  appUrl: string;
  rawApiKey: string;
  workspaceId: string;
  recommendationId: string;
};

export async function runCliRecommendationsSanity(
  input: CliRecommendationsSanityInput,
): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-rec-cli-"));
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
    const listOutput = execSync(`npx tsx ${cliEntry} recommendations list`, {
      cwd: tempDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnv,
    });
    assertNoSecrets(listOutput);
    if (!listOutput.includes("[")) {
      throw new Error("CLI recommendations list did not return JSON array");
    }

    const getOutput = execSync(
      `npx tsx ${cliEntry} recommendations get ${JSON.stringify(input.recommendationId)}`,
      {
        cwd: tempDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: childEnv,
      },
    );
    assertNoSecrets(getOutput);
    if (!getOutput.includes(input.recommendationId)) {
      throw new Error("CLI recommendations get missing recommendation id");
    }

    console.log(`  [PASS] CLI recommendations list/get (${maskApiKey(input.rawApiKey)})`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
