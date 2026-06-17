#!/usr/bin/env tsx
/**
 * Sprint 43 GitHub open-source infra sanity — 13 checks.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TOTAL = 13;

let step = 0;

function pass(label: string): void {
  step += 1;
  console.log(`  [${step}/${TOTAL}] PASS ${label}`);
}

function fail(label: string, detail?: string): never {
  step += 1;
  console.error(`  [${step}/${TOTAL}] FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  process.exit(1);
}

function read(rel: string): string {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) fail(`file exists: ${rel}`);
  return fs.readFileSync(full, "utf8");
}

function main(): void {
  console.log("Sprint 43 GitHub Open Source Infra sanity\n");

  // Setup scripts exist (3)
  for (const script of [
    "scripts/setup-github-open-source-infra.ts",
    "scripts/setup-github-branch-protection.ts",
    "scripts/setup-github-labels.ts",
  ]) {
    read(script);
    pass(`${path.basename(script)} exists`);
  }

  const infra = read("scripts/setup-github-open-source-infra.ts");

  // Infra script contract (5)
  if (!infra.includes('GITHUB_ORG') || !infra.includes('"sortiri"')) {
    fail("setup-github-open-source-infra defaults GITHUB_ORG=sortiri");
  }
  pass("setup-github-open-source-infra defaults GITHUB_ORG=sortiri");

  if (!infra.includes("DRY_RUN") || !infra.includes('PUSH_TO_GITHUB === "true"')) {
    fail("setup-github-open-source-infra dry-run default");
  }
  pass("setup-github-open-source-infra dry-run default");

  if (!infra.includes("PUSH_TO_GITHUB=true")) {
    fail("setup-github-open-source-infra documents PUSH_TO_GITHUB=true");
  }
  pass("setup-github-open-source-infra documents PUSH_TO_GITHUB=true");

  if (!infra.includes("auth status")) {
    fail("setup-github-open-source-infra checks gh auth");
  }
  pass("setup-github-open-source-infra checks gh auth");

  if (!infra.includes("BLOCKED") || !infra.includes("does not exist")) {
    fail("setup-github-open-source-infra blocks missing org");
  }
  pass("setup-github-open-source-infra blocks missing org");

  // Branch protection script (2)
  const branch = read("scripts/setup-github-branch-protection.ts");
  if (!branch.includes("open-source-checks")) {
    fail("branch protection requires open-source-checks");
  }
  pass("branch protection requires open-source-checks");
  if (!branch.includes('BRANCH = "main"')) {
    fail("branch protection targets main");
  }
  pass("branch protection targets main");

  // Labels script (1)
  const labels = read("scripts/setup-github-labels.ts");
  if (!labels.includes('"bug"') || !labels.includes('"enhancement"')) {
    fail("labels script defines core labels");
  }
  pass("labels script defines core labels");

  // package.json scripts (2)
  const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  if (pkg.scripts?.["sanity:open-source-project"] !== "tsx scripts/sanity-open-source-project.ts") {
    fail("package.json sanity:open-source-project script");
  }
  pass("package.json sanity:open-source-project script");
  if (pkg.scripts?.["sanity:github-open-source-infra"] !== "tsx scripts/sanity-github-open-source-infra.ts") {
    fail("package.json sanity:github-open-source-infra script");
  }
  pass("package.json sanity:github-open-source-infra script");

  if (step !== TOTAL) {
    console.error(`\nExpected ${TOTAL} checks, ran ${step}`);
    process.exit(1);
  }

  console.log(`\nSprint 43 GitHub Open Source Infra sanity: PASS (${TOTAL}/${TOTAL})`);
}

main();
