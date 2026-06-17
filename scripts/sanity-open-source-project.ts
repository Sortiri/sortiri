#!/usr/bin/env tsx
/**
 * Sprint 43 open-source project sanity — 40 checks.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TOTAL = 40;

let passed = 0;
let step = 0;

function pass(label: string): void {
  step += 1;
  passed += 1;
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

function includes(rel: string, needle: string, label: string): void {
  const content = read(rel);
  if (!content.toLowerCase().includes(needle.toLowerCase())) {
    fail(label, `expected "${needle}" in ${rel}`);
  }
  pass(label);
}

function main(): void {
  console.log("Sprint 43 Open Source Project sanity\n");

  // GitHub issue templates (10)
  read(".github/ISSUE_TEMPLATE/bug_report.md");
  pass("bug_report.md exists");
  includes(".github/ISSUE_TEMPLATE/bug_report.md", "Sortiri version", "bug_report has version");
  includes(".github/ISSUE_TEMPLATE/bug_report.md", "Node.js version", "bug_report has node");
  includes(".github/ISSUE_TEMPLATE/bug_report.md", "**OS**", "bug_report has os");
  includes(".github/ISSUE_TEMPLATE/bug_report.md", "Package manager", "bug_report has package manager");
  includes(".github/ISSUE_TEMPLATE/bug_report.md", "Command run", "bug_report has command");
  includes(".github/ISSUE_TEMPLATE/bug_report.md", "Expected behavior", "bug_report has expected");
  includes(".github/ISSUE_TEMPLATE/bug_report.md", "Actual behavior", "bug_report has actual");
  includes(".github/ISSUE_TEMPLATE/bug_report.md", "Logs", "bug_report has logs");
  includes(".github/ISSUE_TEMPLATE/bug_report.md", "Local-only", "bug_report has local/cloud");

  // Feature request template (6)
  read(".github/ISSUE_TEMPLATE/feature_request.md");
  pass("feature_request.md exists");
  includes(".github/ISSUE_TEMPLATE/feature_request.md", "Use case", "feature_request has use case");
  includes(".github/ISSUE_TEMPLATE/feature_request.md", "Agent workflow", "feature_request has agent workflow");
  includes(".github/ISSUE_TEMPLATE/feature_request.md", "Source", "feature_request has source");
  includes(".github/ISSUE_TEMPLATE/feature_request.md", "Local-first", "feature_request has local/cloud");
  includes(".github/ISSUE_TEMPLATE/feature_request.md", "Desired outcome", "feature_request has outcome");

  // Docs + config (2)
  read(".github/ISSUE_TEMPLATE/docs_issue.md");
  pass("docs_issue.md exists");
  read(".github/ISSUE_TEMPLATE/config.yml");
  pass("config.yml exists");

  // PR template checklist (7)
  const pr = read(".github/pull_request_template.md");
  pass("pull_request_template.md exists");
  for (const [needle, label] of [
    ["typecheck", "PR checklist typecheck"],
    ["lint", "PR checklist lint"],
    ["test:unit", "PR checklist unit tests"],
    ["Docs updated", "PR checklist docs"],
    ["No secrets", "PR checklist no secrets"],
    ["Local-first", "PR checklist local-first"],
    ["landing", "PR checklist no landing changes"],
  ] as const) {
    if (!pr.toLowerCase().includes(needle.toLowerCase())) fail(label);
    pass(label);
  }

  // CODEOWNERS (2)
  const codeowners = read(".github/CODEOWNERS");
  pass("CODEOWNERS exists");
  if (!codeowners.includes("# * @sortiri/maintainers")) {
    fail("CODEOWNERS has commented maintainers");
  }
  pass("CODEOWNERS has commented maintainers");

  // CI open-source-checks job (5)
  const ci = read(".github/workflows/ci.yml");
  if (!ci.includes("open-source-checks:")) fail("ci.yml has open-source-checks job");
  pass("ci.yml has open-source-checks job");
  for (const [needle, label] of [
    ["npm ci", "ci open-source-checks runs npm ci"],
    ["npm run typecheck", "ci open-source-checks runs typecheck"],
    ["npm run lint", "ci open-source-checks runs lint"],
    ["npm run test:unit", "ci open-source-checks runs test:unit"],
  ] as const) {
    const jobBlock = ci.slice(ci.indexOf("open-source-checks:"), ci.indexOf("\n  lint:"));
    if (!jobBlock.includes(needle)) fail(label);
    pass(label);
  }
  const jobBlock = ci.slice(ci.indexOf("open-source-checks:"), ci.indexOf("\n  lint:"));
  if (jobBlock.includes("secrets.")) fail("ci open-source-checks has no secrets");
  pass("ci open-source-checks has no secrets");

  // Launch assets (4)
  for (const file of ["launch/show-hn.md", "launch/x-thread.md", "launch/reddit-post.md", "launch/demo-script.md"]) {
    read(file);
    pass(`${file} exists`);
  }

  // GitHub org profile (1)
  read("github/profile/README.md");
  pass("github/profile/README.md exists");

  // Demo project sample events (1)
  const eventsPath = "examples/demo-agent-project/.sortiri/events.jsonl";
  const eventsRaw = read(eventsPath);
  const requiredTypes = [
    "agent.action",
    "command.run",
    "code.changed",
    "decision.recorded",
    "incident.opened",
    "rollback.recorded",
    "validation.passed",
  ];
  for (const type of requiredTypes) {
    if (!eventsRaw.includes(`"type":"${type}"`) && !eventsRaw.includes(`"type": "${type}"`)) {
      fail(`events.jsonl includes ${type}`);
    }
  }
  pass("demo events.jsonl has all required event types");

  if (passed !== TOTAL || step !== TOTAL) {
    console.error(`\nExpected ${TOTAL} checks, ran ${step} (passed ${passed})`);
    process.exit(1);
  }

  console.log(`\nSprint 43 Open Source Project sanity: PASS (${TOTAL}/${TOTAL})`);
}

main();
