#!/usr/bin/env tsx
/**
 * Fail if landing/marketing files changed (Sprint 43 guard).
 * Uses `.sprint43-landing-baseline.json` when present (hash baseline).
 * Otherwise falls back to git diff vs main.
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE_PATH = path.join(ROOT, ".sprint43-landing-baseline.json");

const GUARD_PREFIXES = [
  "src/app/page.tsx",
  "src/app/landing.css",
  "src/app/pricing/",
  "src/components/landing/",
  "src/components/pricing/",
  "src/lib/landing-fonts.ts",
];

function normalizePath(file: string): string {
  return file.replace(/\\/g, "/");
}

function isGuarded(file: string): boolean {
  const normalized = normalizePath(file);
  return GUARD_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix),
  );
}

function hashFile(rel: string): string | null {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
  const data = fs.readFileSync(full);
  return createHash("sha256").update(data).digest("hex");
}

function collectGuardedFiles(): string[] {
  const files: string[] = [];
  function walk(rel: string) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) return;
    const stat = fs.statSync(full);
    if (stat.isFile()) {
      if (isGuarded(rel)) files.push(normalizePath(rel));
      return;
    }
    for (const entry of fs.readdirSync(full)) {
      walk(path.join(rel, entry));
    }
  }
  for (const prefix of GUARD_PREFIXES) {
    if (prefix.endsWith("/")) walk(prefix);
    else if (fs.existsSync(path.join(ROOT, prefix))) files.push(normalizePath(prefix));
  }
  return [...new Set(files)].sort();
}

function writeBaseline(): void {
  const files = collectGuardedFiles();
  const baseline: Record<string, string> = {};
  for (const file of files) {
    const hash = hashFile(file);
    if (hash) baseline[file] = hash;
  }
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  console.log(`Wrote landing baseline for ${Object.keys(baseline).length} files`);
}

function checkBaseline(): string[] {
  if (!fs.existsSync(BASELINE_PATH)) return [];
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as Record<string, string>;
  const changed: string[] = [];
  for (const [file, expected] of Object.entries(baseline)) {
    const current = hashFile(file);
    if (current !== expected) changed.push(file);
  }
  return changed;
}

function getDiffFiles(): string[] {
  const files = new Set<string>();
  try {
    const base = execSync("git merge-base HEAD main 2>/dev/null || git merge-base HEAD master", {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    if (base) {
      const diff = execSync(`git diff --name-only ${base}...HEAD`, {
        cwd: ROOT,
        encoding: "utf8",
      });
      for (const line of diff.split("\n").filter(Boolean)) {
        files.add(normalizePath(line));
      }
    }
  } catch {
    // fall through
  }
  try {
    const unstaged = execSync("git diff --name-only", { cwd: ROOT, encoding: "utf8" });
    const staged = execSync("git diff --cached --name-only", { cwd: ROOT, encoding: "utf8" });
    for (const line of [...unstaged.split("\n"), ...staged.split("\n")].filter(Boolean)) {
      files.add(normalizePath(line));
    }
  } catch {
    // not a git repo
  }
  return [...files];
}

function main(): void {
  if (process.argv.includes("--write-baseline")) {
    writeBaseline();
    return;
  }

  const baselineChanged = checkBaseline();
  if (baselineChanged.length > 0) {
    console.error("FAIL: landing/marketing files changed since Sprint 43 baseline:\n");
    for (const file of baselineChanged.sort()) console.error(`  ${file}`);
    process.exit(1);
  }

  if (fs.existsSync(BASELINE_PATH)) {
    console.log("PASS: landing/marketing files match Sprint 43 baseline");
    return;
  }

  const changed = getDiffFiles().filter(isGuarded);
  if (changed.length === 0) {
    console.log("PASS: no landing/marketing file changes detected");
    return;
  }

  console.error("FAIL: landing/marketing files changed:\n");
  for (const file of changed.sort()) {
    console.error(`  ${file}`);
  }
  process.exit(1);
}

main();
