/**
 * CLI setup smoke test — provision token, run init + doctor in a temp git repo.
 *
 * Usage:
 *   WORKSPACE_ID=<external-id> \
 *   SORTIRI_INTEGRATION_SERVER_KEY=<key> \
 *   NEXT_PUBLIC_CONVEX_URL=<url> \
 *   API_URL=http://localhost:3000 \
 *   npm run test:cli-setup
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

type SortiriConfig = {
  apiUrl: string;
  apiKey: string;
  workspaceId: string;
  projectId: string | null;
  projectName?: string;
  editor?: string;
};

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
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
  const tokenResult = await convex.mutation(api.cliSetup.provisionSetupTokenForServer, {
    serverKey,
    workspaceExternalId: workspaceId,
  });

  console.log("Provisioned setup token");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-cli-test-"));
  const repoRoot = path.resolve(".");
  console.log(`Temp repo: ${tempDir}`);

  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" });
    execSync('git config user.email "test@sortiri.local"', { cwd: tempDir, stdio: "ignore" });
    execSync('git config user.name "Sortiri Test"', { cwd: tempDir, stdio: "ignore" });
    execSync("git remote add origin https://github.com/sortiri/cli-smoke-test.git", {
      cwd: tempDir,
      stdio: "ignore",
    });

    const cliEntry = path.join(repoRoot, "packages/cli/src/index.ts");
    execSync(`npx tsx ${cliEntry} init --token ${tokenResult.rawToken} --api-url ${apiUrl}`, {
      cwd: tempDir,
      stdio: "inherit",
    });

    const configPath = path.join(tempDir, ".sortiri", "config.json");
    const sessionPath = path.join(tempDir, ".sortiri", "session.json");
    const mcpPath = path.join(tempDir, ".cursor", "mcp.json");
    const rulePath = path.join(tempDir, ".cursor", "rules", "sortiri.mdc");
    const gitignorePath = path.join(tempDir, ".gitignore");

    for (const filePath of [configPath, sessionPath, mcpPath, rulePath, gitignorePath]) {
      assert(fs.existsSync(filePath), `Expected file: ${filePath}`);
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as SortiriConfig;
    assert(Boolean(config.apiKey?.startsWith("sk_sortiri_")), "API key missing from config");
    assert(config.workspaceId === workspaceId, "Workspace ID mismatch in config");
    assert(Boolean(config.projectId), "Project ID missing from config");
    assert(Boolean(config.projectName), "Project name missing from config");

    const gitignore = fs.readFileSync(gitignorePath, "utf8");
    assert(
      gitignore.includes(".sortiri/config.json") || gitignore.includes(".sortiri/"),
      ".gitignore missing Sortiri entries",
    );

    const doctorOutput = execSync(`npx tsx ${cliEntry} doctor`, {
      cwd: tempDir,
      encoding: "utf8",
    });
    assert(doctorOutput.includes("Your Sortiri project is ready"), "Doctor did not pass");

    const healthResponse = await fetch(
      `${apiUrl}/api/cli/health?projectId=${encodeURIComponent(config.projectId!)}`,
      { headers: { Authorization: `Bearer ${config.apiKey}` } },
    );
    assert(healthResponse.ok, `Health check failed: ${healthResponse.status}`);
    const health = (await healthResponse.json()) as { ok?: boolean; workspaceId?: string };
    assert(Boolean(health.ok) && health.workspaceId === workspaceId, "Health response invalid");

    const reuseResponse = await fetch(`${apiUrl}/api/cli/setup/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupToken: tokenResult.rawToken }),
    });
    assert(reuseResponse.status === 401, "Used token should not work again");

    console.log("\nCLI setup smoke test passed.");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
