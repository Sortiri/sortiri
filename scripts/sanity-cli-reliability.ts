/**
 * Sprint 37 CLI reliability sanity.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertNoSecrets, maskApiKey } from "./lib/sanity-reliability-helpers.js";

export type CliReliabilitySanityInput = {
  appUrl: string;
  rawApiKey: string;
  workspaceId: string;
  deliveryId?: string;
};

export async function runCliReliabilitySanity(
  input: CliReliabilitySanityInput,
): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-reliability-cli-"));
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
    const deliveriesOutput = execSync(`npx tsx ${cliEntry} reliability deliveries --limit 5`, {
      cwd: tempDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnv,
    });
    assertNoSecrets(deliveriesOutput);

    const deadLettersOutput = execSync(`npx tsx ${cliEntry} reliability dead-letters --limit 5`, {
      cwd: tempDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnv,
    });
    assertNoSecrets(deadLettersOutput);

    const journalOutput = execSync(`npx tsx ${cliEntry} reliability journal list --limit 5`, {
      cwd: tempDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnv,
    });
    assertNoSecrets(journalOutput);

    if (input.deliveryId) {
      const deliveries = JSON.parse(
        execSync(`npx tsx ${cliEntry} reliability deliveries --limit 20`, {
          cwd: tempDir,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          env: childEnv,
        }),
      ) as Array<{ id: string; eventId?: string }>;
      const row = deliveries.find((d) => d.id === input.deliveryId);
      if (row && !row.eventId) {
        const replayOutput = execSync(
          `npx tsx ${cliEntry} reliability replay --delivery ${JSON.stringify(input.deliveryId)}`,
          {
            cwd: tempDir,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            env: childEnv,
          },
        );
        assertNoSecrets(replayOutput);
      }
    }

    console.log(`  [PASS] CLI reliability flow (${maskApiKey(input.rawApiKey)})`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
