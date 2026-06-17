/**
 * Sprint 40 CLI incidents sanity.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type CliIncidentsSanityInput = {
  apiUrl: string;
  rawApiKey: string;
  workspaceId: string;
  onStep?: (label: string) => void;
};

export async function runCliIncidentsSanity(input: CliIncidentsSanityInput): Promise<string> {
  const step = input.onStep ?? ((label: string) => console.log(`  [PASS] ${label}`));
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-inc-cli-"));
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
      `npx tsx ${cliEntry} incidents record --title "Sanity incident ${Date.now()}" --service api --severity error`,
      {
        cwd: tempDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: childEnv,
      },
    );
    step("CLI incidents record");

    execSync(`npx tsx ${cliEntry} incidents list`, {
      cwd: tempDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnv,
    });
    step("CLI incidents list");

    const idMatch = recordOutput.match(/"id"\s*:\s*"([^"]+)"/);
    if (!idMatch?.[1]) {
      throw new Error("CLI incidents record did not return incident id");
    }

    const incidentId = idMatch[1];

    execSync(`npx tsx ${cliEntry} incidents get ${JSON.stringify(incidentId)}`, {
      cwd: tempDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnv,
    });
    step("CLI incidents get");

    execSync(
      `npx tsx ${cliEntry} incidents resolve ${JSON.stringify(incidentId)} --root-cause "Sanity test" --mitigation "Auto-resolved in sanity"`,
      {
        cwd: tempDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: childEnv,
      },
    );
    step("CLI incidents resolve");

    return incidentId;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
