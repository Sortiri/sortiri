#!/usr/bin/env tsx
/**
 * Sprint 43 — GitHub open-source infra (org repo, profile, labels, branch protection).
 *
 * Usage:
 *   npx tsx scripts/setup-github-open-source-infra.ts
 *   PUSH_TO_GITHUB=true npx tsx scripts/setup-github-open-source-infra.ts
 *   PUSH_TO_GITHUB=true PUSH_CODE=true npx tsx scripts/setup-github-open-source-infra.ts
 *
 * Env:
 *   GITHUB_ORG=sortiri (default; resolved to canonical login, e.g. Sortiri)
 *   GITHUB_REPO=sortiri (default)
 *   PUSH_TO_GITHUB=true — create/update GitHub resources
 *   PUSH_CODE=true — with PUSH, run `gh repo create ... --source .` (pushes current branch)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const GITHUB_ORG_INPUT = process.env.GITHUB_ORG?.trim() || "sortiri";
const GITHUB_REPO = process.env.GITHUB_REPO?.trim() || "sortiri";
const PUSH = process.env.PUSH_TO_GITHUB === "true";
const PUSH_CODE = process.env.PUSH_CODE === "true";
const DRY_RUN = !PUSH;

const REPO_DESCRIPTION = "Open-source timeline layer for AI-native companies.";
const REPO_HOMEPAGE = "https://sortiri.com";
const REPO_TOPICS = [
  "ai-agents",
  "mcp",
  "cursor",
  "claude-code",
  "codex",
  "developer-tools",
  "agent-memory",
  "timeline",
  "observability",
  "open-source",
  "black-box",
];

let GITHUB_ORG = GITHUB_ORG_INPUT;
let FULL_REPO = `${GITHUB_ORG}/${GITHUB_REPO}`;

type Step = { label: string; run: () => void };

function log(msg: string): void {
  console.log(msg);
}

function gh(args: string, opts?: { stdio?: "pipe" | "inherit" }): string {
  const stdio = opts?.stdio ?? "pipe";
  const result = execSync(`gh ${args}`, {
    cwd: ROOT,
    encoding: stdio === "pipe" ? "utf8" : undefined,
    stdio,
  });
  return typeof result === "string" ? result.trim() : "";
}

function resolveOrgLogin(): void {
  try {
    GITHUB_ORG = gh(`api orgs/${GITHUB_ORG_INPUT} --jq .login`);
    FULL_REPO = `${GITHUB_ORG}/${GITHUB_REPO}`;
    log(`[ok] Resolved org login: ${GITHUB_ORG}`);
  } catch {
    console.error(
      `BLOCKED: GitHub organization "${GITHUB_ORG_INPUT}" does not exist or current gh user cannot access it.`,
    );
    console.error("Do not create a personal repo.");
    console.error("\nManual prerequisite required:");
    console.error("1. Go to GitHub.");
    console.error("2. Create organization: sortiri");
    console.error("3. Keep membership visibility private.");
    console.error("4. Add org display name: Sortiri");
    console.error("5. Add org website: https://sortiri.com");
    console.error("6. Re-run this sprint.");
    process.exit(2);
  }
}

function assertGhAuth(): void {
  gh("auth status");
  log("[ok] gh CLI authenticated");
}

function repoExists(fullName: string): boolean {
  try {
    execSync(`gh repo view ${fullName}`, { cwd: ROOT, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function createMainRepoIfMissing(): void {
  if (repoExists(FULL_REPO)) {
    log(`[ok] Repository already exists: ${FULL_REPO}`);
    return;
  }

  if (DRY_RUN) {
    log(`[dry-run] Would create public repo ${FULL_REPO}`);
    if (PUSH_CODE) {
      log(`[dry-run] Would push current directory as initial commit (--source .)`);
    }
    return;
  }

  const baseArgs = `repo create ${FULL_REPO} --public --description "${REPO_DESCRIPTION}"`;
  if (PUSH_CODE) {
    execSync(`gh ${baseArgs} --source . --remote origin`, { cwd: ROOT, stdio: "inherit" });
    log(`[created] ${FULL_REPO} with --source .`);
    return;
  }

  execSync(`gh ${baseArgs}`, { cwd: ROOT, stdio: "inherit" });
  log(`[created] ${FULL_REPO} (empty — set PUSH_CODE=true to push local tree)`);
}

function setLocalRemote(): void {
  const ssh = `git@github.com:${FULL_REPO}.git`;
  const https = `https://github.com/${FULL_REPO}.git`;

  if (DRY_RUN) {
    log(`[dry-run] Would set git remote origin to ${ssh} (HTTPS fallback: ${https})`);
    return;
  }

  try {
    execSync(`git remote get-url origin`, { cwd: ROOT, stdio: "pipe" });
    execSync(`git remote set-url origin ${ssh}`, { cwd: ROOT, stdio: "inherit" });
  } catch {
    execSync(`git remote add origin ${ssh}`, { cwd: ROOT, stdio: "inherit" });
  }
  log(`[ok] origin → ${ssh}`);
}

function setGitHubTopics(): void {
  if (!repoExists(FULL_REPO)) {
    log(`[skip] Topics — repo ${FULL_REPO} does not exist yet`);
    return;
  }
  if (DRY_RUN) {
    log(`[dry-run] Would set topics: ${REPO_TOPICS.join(", ")}`);
    return;
  }
  execSync(
    `gh api --method PUT repos/${FULL_REPO}/topics --input -`,
    {
      cwd: ROOT,
      input: JSON.stringify({ names: REPO_TOPICS }),
      stdio: ["pipe", "inherit", "inherit"],
    },
  );
  log("[ok] Repo topics updated");
}

function setRepoMetadata(): void {
  if (!repoExists(FULL_REPO)) {
    log(`[skip] Metadata — repo ${FULL_REPO} does not exist yet`);
    return;
  }
  if (DRY_RUN) {
    log(`[dry-run] Would set description and homepage on ${FULL_REPO}`);
    return;
  }
  gh(
    `api --method PATCH repos/${FULL_REPO} -f description="${REPO_DESCRIPTION}" -f homepage="${REPO_HOMEPAGE}" -f has_issues=true -f has_wiki=false`,
    { stdio: "inherit" },
  );
  log("[ok] Repo metadata updated");
}

function createOrgProfileRepoIfMissing(): void {
  const profileRepo = `${GITHUB_ORG}/.github`;
  if (repoExists(profileRepo)) {
    log(`[ok] Org profile repo exists: ${profileRepo}`);
    return;
  }
  if (DRY_RUN) {
    log(`[dry-run] Would create ${profileRepo}`);
    return;
  }
  execSync(`gh repo create ${profileRepo} --public --description "Sortiri organization profile"`, {
    cwd: ROOT,
    stdio: "inherit",
  });
  log(`[created] ${profileRepo}`);
}

function pushOrgProfileReadme(): void {
  const readme = path.join(ROOT, "github", "profile", "README.md");
  if (!fs.existsSync(readme)) {
    throw new Error("Missing github/profile/README.md");
  }
  const profileRepo = `${GITHUB_ORG}/.github`;
  const content = fs.readFileSync(readme, "utf8");

  if (DRY_RUN) {
    log(`[dry-run] Would write profile/README.md to ${profileRepo}`);
    return;
  }

  if (!repoExists(profileRepo)) {
    createOrgProfileRepoIfMissing();
  }

  const tmp = path.join(ROOT, ".tmp-org-profile-readme.md");
  fs.writeFileSync(tmp, content);
  try {
    const b64 = execSync(`base64 < "${tmp}" | tr -d '\\n'`, {
      encoding: "utf8",
      shell: "/bin/bash",
    }).trim();
    execSync(`gh api --method PUT repos/${profileRepo}/contents/profile/README.md --input -`, {
      cwd: ROOT,
      input: JSON.stringify({
        message: "chore: org profile README",
        content: b64,
      }),
      stdio: ["pipe", "inherit", "inherit"],
    });
    log("[ok] Org profile README updated");
  } finally {
    fs.unlinkSync(tmp);
  }
}

function verifyLocalInfraFiles(): void {
  const required = [
    ".github/ISSUE_TEMPLATE/bug_report.md",
    ".github/workflows/ci.yml",
    "github/profile/README.md",
    "README.md",
    "LICENSE",
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      throw new Error(`Missing required file: ${rel}`);
    }
  }
  log(`[ok] ${required.length} core infra files present`);
}

function delegate(script: string, label: string): void {
  log(`\n--- ${label} ---`);
  if (DRY_RUN && !repoExists(FULL_REPO)) {
    log(`[dry-run] Skip ${script} until ${FULL_REPO} exists (run with PUSH_TO_GITHUB=true)`);
    return;
  }
  execSync(`npx tsx scripts/${script}`, {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      PUSH_TO_GITHUB: PUSH ? "true" : "false",
      GITHUB_ORG,
      GITHUB_REPO,
    },
  });
}

const steps: Step[] = [
  { label: "Verify gh authentication", run: assertGhAuth },
  { label: "Resolve GitHub org login", run: resolveOrgLogin },
  { label: "Verify local infra files", run: verifyLocalInfraFiles },
  { label: `Create repo ${FULL_REPO} if missing`, run: createMainRepoIfMissing },
  { label: "Set local git remote origin", run: setLocalRemote },
  { label: "Set repo metadata", run: setRepoMetadata },
  { label: "Set repo topics", run: setGitHubTopics },
  { label: "Create org profile repo", run: createOrgProfileRepoIfMissing },
  { label: "Push org profile README", run: pushOrgProfileReadme },
  { label: "Labels", run: () => delegate("setup-github-labels.ts", "setup-github-labels") },
  {
    label: "Branch protection",
    run: () => delegate("setup-github-branch-protection.ts", "setup-github-branch-protection"),
  },
];

function main(): void {
  log("Sprint 43 — setup-github-open-source-infra");
  log(`Target: ${GITHUB_ORG_INPUT} → ${FULL_REPO}`);
  log(`Mode: ${DRY_RUN ? "dry-run" : "PUSH"}${PUSH_CODE ? " + PUSH_CODE" : ""}`);
  log("");

  for (const step of steps) {
    log(`\n>> ${step.label}`);
    step.run();
  }

  log("\nDone.");
  if (DRY_RUN) {
    log("No remote changes made. Re-run with PUSH_TO_GITHUB=true to apply.");
  } else if (!PUSH_CODE) {
    log(`Repo ${FULL_REPO} is ready. Push code when ready: git push -u origin main`);
  }
}

main();
