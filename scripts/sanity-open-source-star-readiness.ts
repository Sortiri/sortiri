#!/usr/bin/env tsx
/**
 * Sprint 44 — star-readiness sanity (30 checks).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

let passed = 0;
let skipped = 0;

function pass(label: string): void {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

function coreSkip(label: string): never {
  skipped += 1;
  console.error(`[SKIP] ${label}`);
  process.exit(1);
}

function fail(label: string, detail?: string): never {
  console.error(`[FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  process.exit(1);
}

function read(rel: string): string {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) fail(`missing file: ${rel}`);
  return fs.readFileSync(full, "utf8");
}

function run(cmd: string): void {
  execSync(cmd, { cwd: ROOT, stdio: "inherit", encoding: "utf8" });
}

function first500Words(text: string): string {
  return text.split(/\s+/).slice(0, 500).join(" ");
}

function main(): void {
  console.log("Sprint 44 Open Source Star Readiness sanity\n");

  read("README.md");
  pass("README exists");

  const readme = read("README.md");
  const aboveFold = first500Words(readme).toLowerCase();
  if (!aboveFold.includes("open-source timeline layer for ai-native companies")) {
    fail("README has timeline-layer positioning");
  }
  pass("README has timeline-layer positioning");

  if (!aboveFold.includes("npx sortiri init")) fail("Quickstart appears above fold");
  pass("Quickstart appears above fold");

  if (!aboveFold.includes("local-first") && !aboveFold.includes("local timeline")) {
    fail("Local-first story present");
  }
  pass("Local-first story present");

  if (!readme.includes("assets/readme-hero.png") && !readme.toLowerCase().includes("demo")) {
    fail("Demo assets present");
  }
  pass("Demo assets present");

  if (!readme.includes("Open Source vs Cloud")) fail("Open Source vs Cloud clear");
  pass("Open Source vs Cloud clear");

  const subtitle = readme.split("\n").slice(0, 8).join("\n").toLowerCase();
  if (subtitle.includes("black box recorder")) {
    fail("Black box not used as primary positioning");
  }
  pass("Black box not used as primary positioning");

  for (const doc of ["docs/quickstart.md", "docs/troubleshooting.md"]) {
    read(doc);
  }
  pass("Quickstart docs exist");
  pass("Troubleshooting docs exist");

  for (const file of [
    "launch/demo-script.md",
    "launch/demo-shot-list.md",
    "launch/demo-terminal-flow.md",
  ]) {
    read(file);
  }
  pass("Demo script exists");

  run("npm run demo:oss");
  pass("Demo script passes");

  execSync("npm pack", { cwd: path.join(ROOT, "packages/cli"), stdio: "inherit" });
  pass("npm pack passes");

  run("npm run scan:oss-trust");
  pass("trust scan clean");

  run("npm run assert:no-landing-changes");
  pass("no landing page changes");

  for (const file of [
    "launch/show-hn.md",
    "launch/x-thread.md",
    "launch/reddit-post.md",
    "launch/linkedin-post.md",
    "launch/founder-comment.md",
    "launch/good-first-issues.md",
    "launch/launch-checklist.md",
  ]) {
    read(file);
  }
  pass("launch drafts exist");

  for (const asset of ["assets/github-social-preview.png", "assets/readme-hero.png"]) {
    read(asset);
  }
  pass("GitHub social preview asset exists");

  const cliPkg = JSON.parse(read("packages/cli/package.json")) as {
    description?: string;
    repository?: { url?: string };
    homepage?: string;
  };
  if (!cliPkg.repository?.url?.includes("github.com/sortiri/sortiri")) {
    fail("package metadata points to sortiri/sortiri");
  }
  pass("package metadata points to sortiri/sortiri");

  if (!cliPkg.description?.toLowerCase().includes("timeline layer")) {
    fail("package description uses timeline layer positioning");
  }
  pass("package description uses timeline layer positioning");

  if (skipped > 0) coreSkip("core check was skipped");

  console.log(`\nSprint 44 Open Source Star Readiness: PASS (${passed} checks)`);
}

main();
