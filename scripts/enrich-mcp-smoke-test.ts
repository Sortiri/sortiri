/**
 * Appends follow-up replay steps to the "MCP smoke test" workstream.
 * Idempotent — skips if the workstream already has more than one event.
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

async function main() {
  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const ingestKey = requireEnv("SORTIRI_DEV_INGEST_KEY");
  const workspaceId = requireEnv("SORTIRI_WORKSPACE_ID");

  const client = new ConvexHttpClient(convexUrl);
  const result = await client.mutation(api.ingest.enrichMcpSmokeTest, {
    ingestKey,
    workspaceId,
  });

  if (result.skipped) {
    console.log(result.message ?? "Already enriched");
  } else {
    console.log(`Added ${result.inserted} events to workstream ${result.workstreamId}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
