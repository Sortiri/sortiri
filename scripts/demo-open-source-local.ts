#!/usr/bin/env tsx
/**
 * Sprint 44 — one-command open-source local demo.
 * Creates a temp repo, seeds events, exports JSONL, and smoke-checks the local viewer.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDoctor } from "../packages/cli/src/commands/doctor.js";
import { runExport } from "../packages/cli/src/commands/export.js";
import { runInit } from "../packages/cli/src/commands/init.js";
import { runRecord } from "../packages/cli/src/commands/record.js";
import { startLocalViewer } from "../packages/cli/src/localViewer.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI_PKG = path.join(ROOT, "packages/cli");

const SEED_EVENTS = [
  {
    type: "agent.action",
    title: "Updated onboarding flow",
    summary: "Changed onboarding page copy and CTA",
  },
  {
    type: "decision.recorded",
    title: "Use local-first timeline before cloud sync",
    summary: "Start with JSONL journal; add cloud when team needs shared history",
  },
  {
    type: "command.run",
    title: "npm run test",
    summary: "Validation suite passed",
  },
  {
    type: "command.failed",
    title: "Checkout validation failed",
    summary: "Integration test exited non-zero",
  },
  {
    type: "code.changed",
    title: "Edited checkout validation",
    summary: "src/checkout/validate.ts",
  },
  {
    type: "incident.opened",
    title: "Checkout validation failed",
    summary: "Elevated error rate on /checkout",
  },
  {
    type: "rollback.recorded",
    title: "Reverted checkout experiment",
    summary: "Rolled back feature flag checkout-v2",
  },
  {
    type: "validation.passed",
    title: "Post-rollback validation passed",
    summary: "npm run test:integration",
  },
] as const;

function pass(label: string): void {
  console.log(`[PASS] ${label}`);
}

function fail(label: string, detail?: string): never {
  console.error(`[FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  process.exit(1);
}

function createTempDemoRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-oss-demo-"));
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "sortiri-oss-demo", version: "1.0.0" }, null, 2),
  );
  execSync("git init", { cwd: root, stdio: "ignore" });
  execSync('git config user.email "demo@sortiri.local"', { cwd: root, stdio: "ignore" });
  execSync('git config user.name "Sortiri Demo"', { cwd: root, stdio: "ignore" });
  return root;
}

async function runDemoInRepo(root: string): Promise<{
  exportPath: string;
  eventIds: string[];
}> {
  const prev = process.cwd();
  const eventIds: string[] = [];
  try {
    process.chdir(root);
    await runInit({ yes: true });
    pass("Initialized Sortiri");

    for (const seed of SEED_EVENTS) {
      await runRecord({
        type: seed.type,
        title: seed.title,
        summary: seed.summary,
      });
    if (seed.type === "agent.action") pass("Seeded agent action");
    else if (seed.type === "decision.recorded") pass("Seeded decision");
    else if (seed.type === "command.run") pass("Seeded command");
    else if (seed.type === "incident.opened") pass("Seeded incident");
    else if (seed.type === "rollback.recorded") pass("Seeded rollback");
    else pass(`Seeded ${seed.type}`);
    }

    await runDoctor({ record: false });
    pass("Doctor passed");

    const exportPath = path.join(root, "timeline-export.jsonl");
    await runExport({ out: exportPath });
    if (!fs.existsSync(exportPath)) fail("Export file missing");
    pass("Exported local timeline");

    await startLocalViewer({ smoke: true, port: 4318 });
    pass("Local viewer smoke passed");

    const journal = fs.readFileSync(path.join(root, ".sortiri", "events.jsonl"), "utf8");
    for (const line of journal.split("\n").filter(Boolean)) {
      const parsed = JSON.parse(line) as { id?: string };
      if (parsed.id) eventIds.push(parsed.id);
    }

    return { exportPath, eventIds };
  } finally {
    process.chdir(prev);
  }
}

function packToDir(pkgDir: string, dest: string): string {
  const tarball = execSync(`npm pack --pack-destination ${dest}`, {
    cwd: pkgDir,
    encoding: "utf8",
  }).trim();
  return path.join(dest, tarball);
}

function runNpmPackInit(): void {
  const packDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-pack-"));
  try {
    const securityTgz = packToDir(path.join(ROOT, "packages/sortiri-security"), packDir);
    const localTgz = packToDir(path.join(ROOT, "packages/sortiri-local"), packDir);
    const mcpTgz = packToDir(path.join(ROOT, "packages/mcp"), packDir);
    const cliTgz = packToDir(CLI_PKG, packDir);
    pass(`npm pack created ${path.basename(cliTgz)}`);

    const installRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sortiri-pack-install-"));
    fs.writeFileSync(
      path.join(installRoot, "package.json"),
      JSON.stringify(
        {
          name: "sortiri-pack-install-test",
          private: true,
          dependencies: {
            "@sortiri/security": `file:${securityTgz}`,
            "@sortiri/local": `file:${localTgz}`,
            "@sortiri/mcp": `file:${mcpTgz}`,
            sortiri: `file:${cliTgz}`,
          },
        },
        null,
        2,
      ),
    );
    execSync("npm install", { cwd: installRoot, stdio: "pipe", encoding: "utf8" });
    execSync("git init", { cwd: installRoot, stdio: "ignore" });
    execSync("npx tsx node_modules/sortiri/src/index.ts init --yes", {
      cwd: installRoot,
      stdio: "pipe",
      encoding: "utf8",
    });
    const configPath = path.join(installRoot, ".sortiri", "config.json");
    if (!fs.existsSync(configPath)) fail("npm pack init did not create config");
    pass("Publish-equivalent npm pack init passed");
    fs.rmSync(installRoot, { recursive: true, force: true });
  } finally {
    fs.rmSync(packDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  console.log("Sortiri open-source local demo\n");

  const root = createTempDemoRepo();
  pass("Created temp demo repo");
  console.log(`Temp repo: ${root}`);

  const { exportPath, eventIds } = await runDemoInRepo(root);
  console.log(`Export: ${exportPath}`);
  console.log(`Event IDs: ${eventIds.slice(0, 5).join(", ")}${eventIds.length > 5 ? "..." : ""}`);

  runNpmPackInit();

  console.log("\nDemo commands:");
  console.log("  npx sortiri init");
  console.log("  sortiri doctor");
  console.log("  sortiri record --type agent.action --title \"Updated onboarding flow\"");
  console.log("  sortiri export --out timeline.jsonl");
  console.log("  sortiri dev");
  console.log("\nNote: Real npm registry `npx sortiri init` not tested because package is not published yet.");
  console.log("Publish-equivalent npm pack flow passed.");

  fs.rmSync(root, { recursive: true, force: true });
  console.log("\nSortiri OSS demo: PASS");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

export { SEED_EVENTS, createTempDemoRepo };
