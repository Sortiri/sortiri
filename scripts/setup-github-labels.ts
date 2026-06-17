#!/usr/bin/env tsx
/**
 * Sprint 43 — create standard GitHub labels for open-source triage.
 *
 * Usage:
 *   npx tsx scripts/setup-github-labels.ts          # dry-run
 *   PUSH_TO_GITHUB=true npx tsx scripts/setup-github-labels.ts
 *
 * Env:
 *   GITHUB_ORG=sortiri (default)
 *   GITHUB_REPO=sortiri (default)
 */
import { execSync } from "node:child_process";

const GITHUB_ORG = process.env.GITHUB_ORG?.trim() || "sortiri";
const GITHUB_REPO = process.env.GITHUB_REPO?.trim() || "sortiri";
const REPO = `${GITHUB_ORG}/${GITHUB_REPO}`;
const PUSH = process.env.PUSH_TO_GITHUB === "true";
const DRY_RUN = !PUSH;

const LABELS: Array<{ name: string; color: string; description: string }> = [
  { name: "bug", color: "d73a4a", description: "Something isn't working" },
  { name: "enhancement", color: "a2eeef", description: "New feature or request" },
  { name: "documentation", color: "0075ca", description: "Improvements or corrections to docs" },
  { name: "good first issue", color: "7057ff", description: "Good for newcomers" },
  { name: "help wanted", color: "008672", description: "Extra attention is needed" },
  { name: "local-first", color: "bfd4f2", description: "Local timeline / CLI without cloud" },
  { name: "mcp", color: "5319e7", description: "MCP server or tools" },
  { name: "cli", color: "fbca04", description: "Sortiri CLI" },
  { name: "integrations", color: "1d76db", description: "GitHub, Slack, Stripe, PostHog, etc." },
  { name: "reliability", color: "b60205", description: "Ingest, dead letters, replay" },
  { name: "security", color: "ee0701", description: "Security issue or hardening" },
  { name: "wontfix", color: "ffffff", description: "This will not be worked on" },
];

function log(msg: string): void {
  console.log(msg);
}

function assertGhAuth(): void {
  execSync("gh auth status", { stdio: "pipe" });
}

function assertRepoExists(): void {
  try {
    execSync(`gh repo view ${REPO}`, { stdio: "pipe" });
    log(`[ok] Repository exists: ${REPO}`);
  } catch {
    if (DRY_RUN) {
      log(`[dry-run] Repository ${REPO} does not exist yet — skipping labels`);
      process.exit(0);
    }
    throw new Error(`Repository not found: ${REPO}`);
  }
}

function upsertLabel(label: (typeof LABELS)[number]): void {
  if (DRY_RUN) {
    log(`[dry-run] label ${label.name} (${label.color}) — ${label.description}`);
    return;
  }
  try {
    execSync(
      `gh label create "${label.name}" --color "${label.color}" --description "${label.description}" --repo ${REPO}`,
      { stdio: "pipe" },
    );
    log(`[created] ${label.name}`);
  } catch {
    execSync(
      `gh label edit "${label.name}" --color "${label.color}" --description "${label.description}" --repo ${REPO}`,
      { stdio: "pipe" },
    );
    log(`[updated] ${label.name}`);
  }
}

function main(): void {
  log("Sprint 43 — setup-github-labels");
  log(`REPO=${REPO}`);
  log(`Mode: ${DRY_RUN ? "dry-run" : "PUSH"}`);
  log(`Labels: ${LABELS.length}`);

  assertGhAuth();
  assertRepoExists();

  for (const label of LABELS) {
    upsertLabel(label);
  }

  log("\nDone.");
}

main();
