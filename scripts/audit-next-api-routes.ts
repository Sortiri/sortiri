#!/usr/bin/env tsx
/**
 * Audit Next.js API routes and classify migration status.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCAN_DIRS = [
  path.join(ROOT, "src/app/api"),
  path.join(ROOT, "pages/api"),
  path.join(ROOT, "src/pages/api"),
];

const HIGH_VOLUME_KEYWORDS = [
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
];

const ALLOWED_PREFIXES = [
  "/api/audits/",
  "/api/share/audit/",
  "/api/health",
  "/api/auth/",
  "/api/compat/",
];

type Row = {
  route: string;
  file: string;
  methods: string[];
  classification: string;
  migrationStatus: string;
};

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
  const rel = path.relative(path.join(ROOT, "src/app"), file).replace(/\\/g, "/");
  const withoutRoute = rel.replace(/\/route\.ts$/, "");
  return `/${withoutRoute}`;
}

function classify(route: string, content: string): { classification: string; migrationStatus: string } {
  if (ALLOWED_PREFIXES.some((p) => route.startsWith(p))) {
    return { classification: "allowed", migrationStatus: "keep" };
  }
  if (content.includes("goneResponse(")) {
    return { classification: "compat-shim", migrationStatus: "migrated-410" };
  }
  const lower = `${route} ${content}`.toLowerCase();
  if (HIGH_VOLUME_KEYWORDS.some((k) => lower.includes(k))) {
    return { classification: "high-volume-backend", migrationStatus: "unmigrated" };
  }
  return { classification: "unknown", migrationStatus: "review" };
}

function extractMethods(content: string): string[] {
  const methods: string[] = [];
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    if (new RegExp(`export async function ${m}`).test(content)) {
      methods.push(m);
    }
  }
  return methods;
}

function main() {
  const files = SCAN_DIRS.flatMap((dir) => walk(dir));
  const rows: Row[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const route = routeFromFile(file);
    const methods = extractMethods(content);
    const { classification, migrationStatus } = classify(route, content);
    rows.push({ route, file: path.relative(ROOT, file), methods, classification, migrationStatus });
  }

  console.log("Next.js API Route Audit\n");
  for (const row of rows.sort((a, b) => a.route.localeCompare(b.route))) {
    console.log(
      `${row.migrationStatus.padEnd(14)} ${row.methods.join(",").padEnd(12)} ${row.route}  (${row.classification})`,
    );
  }

  const unmigrated = rows.filter((r) => r.migrationStatus === "unmigrated");
  console.log(`\nTotal routes: ${rows.length}`);
  console.log(`Unmigrated high-volume: ${unmigrated.length}`);

  if (unmigrated.length > 0) {
    console.error("\nFAIL: unmigrated high-volume backend routes remain");
    process.exit(1);
  }
  console.log("\nPASS: no unmigrated high-volume backend routes");
}

main();
