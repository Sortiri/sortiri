#!/usr/bin/env tsx
/**
 * Sprint 38 Convex API surface sanity orchestrator.
 */
import { spawnSync } from "node:child_process";
import { loadEnvLocal, getConvexHttpUrl } from "./lib/sanity-reliability-helpers.js";

function run(label: string, cmd: string, args: string[]): boolean {
  console.log(`\n--- ${label} ---`);
  const result = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    console.error(`[FAIL] ${label}`);
    return false;
  }
  console.log(`[PASS] ${label}`);
  return true;
}

async function main() {
  loadEnvLocal();
  const apiUrl = getConvexHttpUrl();
  console.log("Sprint 38 Convex API Surface sanity\n");
  console.log(`Convex HTTP base: ${apiUrl}`);

  const checks = [
    run("Convex HTTP ingest (enterprise reliability)", "npm", ["run", "sanity:enterprise-reliability"]),
    run("No disallowed Next API backend routes", "npm", ["run", "assert:no-next-backend-routes"]),
    run("API route audit", "npx", ["tsx", "scripts/audit-next-api-routes.ts"]),
  ];

  const allPass = checks.every(Boolean);
  console.log("\nSprint 38 Real Testing Completion Report");
  console.log(`Status: ${allPass ? "PASS" : "FAIL"}`);
  console.log(`Convex HTTP base URL resolved: ${apiUrl}`);
  console.log(`Ready for next sprint: ${allPass ? "YES" : "NO"}`);
  if (!allPass) process.exit(1);
}

void main();
