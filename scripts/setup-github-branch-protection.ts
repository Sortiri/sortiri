#!/usr/bin/env tsx
/**
 * Sprint 43 — configure branch protection on main for open-source checks.
 *
 * Usage:
 *   npx tsx scripts/setup-github-branch-protection.ts          # dry-run
 *   PUSH_TO_GITHUB=true npx tsx scripts/setup-github-branch-protection.ts
 *
 * Env:
 *   GITHUB_ORG=sortiri (default)
 *   GITHUB_REPO=sortiri (default, repo name under org)
 */
import { execSync } from "node:child_process";

const GITHUB_ORG = process.env.GITHUB_ORG?.trim() || "sortiri";
const GITHUB_REPO = process.env.GITHUB_REPO?.trim() || "sortiri";
const REPO = `${GITHUB_ORG}/${GITHUB_REPO}`;
const BRANCH = "main";
const PUSH = process.env.PUSH_TO_GITHUB === "true";
const DRY_RUN = !PUSH;

const REQUIRED_CHECK = "open-source-checks";

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
      log(`[dry-run] Repository ${REPO} does not exist yet — skipping branch protection`);
      process.exit(0);
    }
    throw new Error(`Repository not found: ${REPO}`);
  }
}

function applyBranchProtection(): void {
  const payload = {
    required_status_checks: {
      strict: true,
      contexts: [REQUIRED_CHECK],
    },
    enforce_admins: false,
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      required_approving_review_count: 1,
    },
    restrictions: null,
    required_linear_history: false,
    allow_force_pushes: false,
    allow_deletions: false,
  };

  log(`\n--- Branch protection: ${REPO}@${BRANCH} ---`);
  log(`Required status check: ${REQUIRED_CHECK}`);

  if (DRY_RUN) {
    log("[dry-run] Would PUT branch protection with payload:");
    log(JSON.stringify(payload, null, 2));
    return;
  }

  try {
    execSync(
      `gh api --method PUT repos/${REPO}/branches/${BRANCH}/protection --input -`,
      {
        input: JSON.stringify(payload),
        stdio: ["pipe", "inherit", "inherit"],
      },
    );
    log("[applied] Branch protection updated");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Branch not found") || message.includes("404")) {
      log(
        `[warn] Branch '${BRANCH}' not found — push an initial commit first, then re-run branch protection`,
      );
      return;
    }
    throw error;
  }
}

function main(): void {
  log("Sprint 43 — setup-github-branch-protection");
  log(`REPO=${REPO} BRANCH=${BRANCH}`);
  log(`Mode: ${DRY_RUN ? "dry-run" : "PUSH"}`);

  assertGhAuth();
  assertRepoExists();
  applyBranchProtection();

  log("\nDone.");
}

main();
