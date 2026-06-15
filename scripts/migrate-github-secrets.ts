/**
 * Migrate legacy githubWebhookSecrets to encrypted integrationSecrets.
 *
 * Usage: npx tsx scripts/migrate-github-secrets.ts
 */

import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    let value = trimmed.slice(index + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main() {
  loadEnvLocal();

  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const serverKey = requireEnv("SORTIRI_INTEGRATION_SERVER_KEY");

  const client = new ConvexHttpClient(convexUrl);
  const result = await client.mutation(api.integrations.migrate.migrateLegacyGithubSecrets, {
    serverKey,
  });

  console.log("GitHub Secret Migration\n");
  console.log(`Workspaces scanned: ${result.workspacesScanned}`);
  console.log(`Active GitHub secrets found: ${result.activeLegacySecretsFound}`);
  console.log(`Migrated: ${result.migrated}`);
  console.log(`Skipped existing encrypted secrets: ${result.skippedExistingEncrypted}`);
  console.log(`Failed: ${result.failed}`);

  if (result.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
