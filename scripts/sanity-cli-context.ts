/**
 * Sprint 33 CLI context sanity — exercises `sortiri context` against real HTTP routes.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  assertContextSections,
  assertNoSecrets,
  createContextPackViaHttp,
  getAppUrl,
  maskApiKey,
} from "./lib/sanity-context-helpers.js";
import type { Id } from "../convex/_generated/dataModel";

export type CliContextSanityInput = {
  appUrl: string;
  rawApiKey: string;
  workspaceId: string;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
};

export async function runCliContextSanity(input: CliContextSanityInput): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-context-cli-"));
  const configPath = path.join(tempDir, ".sortiri", "config.json");
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(
    configPath,
    `${JSON.stringify(
      {
        apiUrl: input.appUrl,
        apiKey: input.rawApiKey,
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
        editor: "cursor",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const cliEntry = path.resolve("packages/cli/src/index.ts");
  const goal = "Fix Stripe webhook failures";
  const childEnv = { ...process.env };
  delete childEnv.SORTIRI_WORKSPACE_ID;
  delete childEnv.SORTIRI_API_KEY;
  delete childEnv.SORTIRI_API_URL;

  try {
    const output = execSync(`npx tsx ${cliEntry} context --goal ${JSON.stringify(goal)}`, {
      cwd: tempDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnv,
    });

    assertNoSecrets(output);
    assertContextSections(output);
    if (!output.includes("CONTEXT PACK")) {
      throw new Error("CLI output missing CONTEXT PACK header");
    }
    console.log(`  [PASS] CLI sortiri context created context pack (${maskApiKey(input.rawApiKey)})`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const httpPack = await createContextPackViaHttp(
    input.appUrl,
    input.rawApiKey,
    input.workspaceId,
    goal,
    input.projectId,
    input.workstreamId,
  );
  if (!httpPack.contextPackId) {
    throw new Error("CLI companion HTTP create did not return contextPackId");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rawApiKey = process.env.SANITY_CONTEXT_API_KEY?.trim();
  const workspaceId = process.env.SANITY_CONTEXT_WORKSPACE_ID?.trim();
  if (!rawApiKey || !workspaceId) {
    console.error("Set SANITY_CONTEXT_API_KEY and SANITY_CONTEXT_WORKSPACE_ID");
    process.exit(1);
  }
  void runCliContextSanity({
    appUrl: getAppUrl(),
    rawApiKey,
    workspaceId,
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
