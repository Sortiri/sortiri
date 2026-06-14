/**
 * CLI command capture smoke test — init temp repo, run pass/fail commands, verify events.
 *
 * Usage:
 *   WORKSPACE_ID=<external-id> \
 *   SORTIRI_INTEGRATION_SERVER_KEY=<key> \
 *   NEXT_PUBLIC_CONVEX_URL=<url> \
 *   API_URL=http://localhost:3000 \
 *   npm run test:cli-run
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function runCli(
  cliEntry: string,
  cwd: string,
  args: string,
  expectExitCode = 0,
): void {
  try {
    execSync(`npx tsx ${cliEntry} ${args}`, {
      cwd,
      stdio: "inherit",
      env: process.env,
    });
    if (expectExitCode !== 0) {
      throw new Error(`Expected exit code ${expectExitCode}, got 0`);
    }
  } catch (error) {
    const exitCode =
      error && typeof error === "object" && "status" in error
        ? (error as { status?: number }).status
        : undefined;
    if (exitCode !== expectExitCode) {
      throw error;
    }
  }
}

async function main() {
  const apiUrl = (process.env.API_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const workspaceId = process.env.WORKSPACE_ID;
  const serverKey = process.env.SORTIRI_INTEGRATION_SERVER_KEY;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!workspaceId) {
    throw new Error("Set WORKSPACE_ID to your workspace external ID");
  }
  if (!serverKey) {
    throw new Error("Set SORTIRI_INTEGRATION_SERVER_KEY");
  }
  if (!convexUrl) {
    throw new Error("Set NEXT_PUBLIC_CONVEX_URL");
  }

  const convex = new ConvexHttpClient(convexUrl);
  const repoRoot = path.resolve(".");
  const cliEntry = path.join(repoRoot, "packages/cli/src/index.ts");
  const sinceMs = Date.now();

  const tokenResult = await convex.mutation(api.cliSetup.provisionSetupTokenForServer, {
    serverKey,
    workspaceExternalId: workspaceId,
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-cli-run-test-"));
  console.log(`Temp repo: ${tempDir}`);

  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" });
    execSync('git config user.email "test@sortiri.local"', { cwd: tempDir, stdio: "ignore" });
    execSync('git config user.name "Sortiri Test"', { cwd: tempDir, stdio: "ignore" });

    runCli(
      cliEntry,
      tempDir,
      `init --token ${tokenResult.rawToken} --api-url ${apiUrl}`,
    );

    console.log("\n=== sortiri run -- echo hello ===");
    runCli(cliEntry, tempDir, 'run -- echo "hello sortiri"', 0);

    console.log("\n=== sortiri run -- failing command ===");
    runCli(cliEntry, tempDir, "run -- false", 1);

    console.log("\n=== sortiri run -- redaction check ===");
    runCli(
      cliEntry,
      tempDir,
      'run -- echo "Bearer sk_live_secret_token_should_be_redacted"',
      0,
    );

    const counts = await convex.query(api.cliRun.countCommandEventsForTest, {
      serverKey,
      workspaceExternalId: workspaceId,
      sinceMs,
    });

    assert(counts.commandStarted >= 3, `Expected >= 3 command.started, got ${counts.commandStarted}`);
    assert(counts.commandCompleted >= 2, `Expected >= 2 command.completed, got ${counts.commandCompleted}`);
    assert(counts.commandFailed >= 1, `Expected >= 1 command.failed, got ${counts.commandFailed}`);
    assert(
      counts.commandOutputArtifacts >= 3,
      `Expected >= 3 command_output artifacts, got ${counts.commandOutputArtifacts}`,
    );

    if (counts.sampleOutput) {
      assert(
        !counts.sampleOutput.includes("sk_live_secret"),
        "Command output should redact secrets",
      );
      assert(
        counts.sampleOutput.includes("[REDACTED]") ||
          !counts.sampleOutput.includes("Bearer sk_live"),
        "Bearer token should be redacted in stored output",
      );
    }

    console.log("\nCLI command capture smoke test passed.");
    console.log(counts);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
