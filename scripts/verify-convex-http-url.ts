#!/usr/bin/env tsx
/**
 * Verify SORTIRI_API_URL points to Convex HTTP Actions and health responds.
 */
import { loadEnvFile } from "node:process";

loadEnvFile(".env.local");

function deriveSiteUrl(cloudUrl: string): string {
  return cloudUrl.replace(/\.convex\.cloud\/?$/, ".convex.site");
}

function resolveApiUrl(): string {
  const direct =
    process.env.SORTIRI_API_URL ??
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
    process.env.CONVEX_SITE_URL;
  if (direct) return direct.replace(/\/$/, "");

  const cloud = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (cloud) return deriveSiteUrl(cloud.replace(/\/$/, ""));

  throw new Error(
    "Could not resolve SORTIRI_API_URL — set SORTIRI_API_URL or NEXT_PUBLIC_CONVEX_URL",
  );
}

async function main() {
  const apiUrl = resolveApiUrl();

  if (apiUrl.includes("localhost:3000")) {
    console.error("FAIL: SORTIRI_API_URL must not use localhost:3000");
    process.exit(1);
  }

  if (!apiUrl.endsWith(".convex.site")) {
    console.error(`FAIL: SORTIRI_API_URL must end with .convex.site (got ${apiUrl})`);
    process.exit(1);
  }

  console.log(`SORTIRI_API_URL=${apiUrl}`);

  const healthRes = await fetch(`${apiUrl}/health`);
  const status = healthRes.status;

  // /health requires API key; 401 proves route is live on Convex HTTP.
  if (status === 401 || status === 403) {
    console.log(`PASS: /health reachable (${status} without API key — route exists)`);
    return;
  }

  if (!healthRes.ok) {
    console.error(`FAIL: GET ${apiUrl}/health returned ${status}`);
    process.exit(1);
  }

  console.log(`PASS: /health responded ${status}`);
  const body = (await healthRes.json().catch(() => null)) as { error?: string } | null;
  if (body && "error" in body) {
    console.log(`  body: ${JSON.stringify(body)}`);
  }
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
