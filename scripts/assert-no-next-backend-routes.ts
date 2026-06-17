#!/usr/bin/env tsx
/**
 * Fail if disallowed backend logic remains in Next.js API routes.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCAN_ROOTS = [
  path.join(ROOT, "src/app/api"),
  path.join(ROOT, "pages/api"),
  path.join(ROOT, "src/pages/api"),
];

const ALLOWED_ROUTE_PREFIXES = [
  "/api/audits/",
  "/api/share/audit/",
  "/api/health",
  "/api/auth/",
  "/api/compat/",
];

const DISALLOWED_KEYWORDS = [
  "ingest",
  "webhook",
  "stripe",
  "github",
  "posthog",
  "mcp",
  "cli",
  "eval",
  "recommendation",
  "reliability",
  "journal",
  "dead-letter",
  "api key validation",
  "authenticateIngest",
  "runIngestPipeline",
  "runWebhookIngestPipeline",
];

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name === "route.ts") acc.push(full);
  }
  return acc;
}

function routeFromFile(file: string): string {
  if (file.includes(`${path.sep}src${path.sep}app${path.sep}api${path.sep}`)) {
    const rel = path.relative(path.join(ROOT, "src/app"), file).replace(/\\/g, "/");
    return `/${rel.replace(/\/route\.ts$/, "")}`;
  }
  return file;
}

function isAllowed(route: string): boolean {
  return ALLOWED_ROUTE_PREFIXES.some((prefix) => route.startsWith(prefix));
}

function main() {
  const violations: Array<{ route: string; file: string; keyword: string }> = [];

  for (const root of SCAN_ROOTS) {
    for (const file of walk(root)) {
      const route = routeFromFile(file);
      if (isAllowed(route)) continue;
      const content = fs.readFileSync(file, "utf8").toLowerCase();
      if (content.includes("goneresponse(")) continue;
      for (const keyword of DISALLOWED_KEYWORDS) {
        if (content.includes(keyword.toLowerCase())) {
          violations.push({
            route,
            file: path.relative(ROOT, file),
            keyword,
          });
          break;
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log("PASS: no disallowed Next API backend routes found");
    return;
  }

  console.error("FAIL: disallowed Next API backend routes found:\n");
  for (const v of violations) {
    console.error(`  ${v.route} (${v.file}) — matched "${v.keyword}"`);
  }
  process.exit(1);
}

main();
