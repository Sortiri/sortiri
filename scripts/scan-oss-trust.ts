#!/usr/bin/env tsx
/**
 * Sprint 44 — trust/safety scan for OSS launch assets.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const SCAN_TARGETS = [
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "docs",
  "launch",
  "examples",
  "assets",
  "packages/cli/package.json",
  "github/profile/README.md",
];

const ALLOWLIST = [
  "example.com",
  "sk_sortiri_example",
  "evt_example",
  "workspace_example",
  "github.com/sortiri/sortiri",
  "test@sortiri.local",
  "demo@sortiri.local",
];

type Finding = { file: string; rule: string; excerpt: string };

function collectFiles(target: string): string[] {
  const full = path.join(ROOT, target);
  if (!fs.existsSync(full)) return [];
  const stat = fs.statSync(full);
  if (stat.isFile()) return [full];
  const out: string[] = [];
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const child = path.join(full, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(path.relative(ROOT, child)));
    else if (/\.(md|mdc|jsonl|json|txt|ts|tsx|png)$/i.test(entry.name)) out.push(child);
  }
  return out;
}

function isAllowlisted(line: string): boolean {
  return ALLOWLIST.some((token) => line.toLowerCase().includes(token.toLowerCase()));
}

function scanContent(rel: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split("\n");

  const push = (rule: string, line: string) => {
    if (isAllowlisted(line)) return;
    findings.push({ file: rel, rule, excerpt: line.trim().slice(0, 120) });
  };

  for (const line of lines) {
    if (/\d{1,3}\s*github\s*stars/i.test(line) && !/\bno\b|\bnot\b|\bnever\b/i.test(line)) {
      push("fake GitHub stars", line);
    }
    if (/soc\s*2\s*certified/i.test(line)) push("SOC 2 claim", line);
    if (/compliance[- ]ready/i.test(line) && !/\bno\b|\bnot\b|\bnever\b|\bavoid\b/i.test(line)) {
      push("compliance-ready claim", line);
    }
    if (/sk_sortiri_[a-z0-9]{8,}/i.test(line)) push("real-looking API key", line);
    if (/@[a-z0-9.-]+\.(gmail|yahoo|hotmail)\.com/i.test(line)) push("personal email", line);
    if (/github\.com\/(clayton|clayton-dcruze|claytondcruze)/i.test(line)) {
      push("personal GitHub remote", line);
    }
  }

  if (rel === "README.md" || rel === "packages/cli/package.json") {
    const first500 = content.split(/\s+/).slice(0, 500).join(" ").toLowerCase();
    if (first500.includes("open-source black box recorder")) {
      findings.push({
        file: rel,
        rule: "black box as primary positioning",
        excerpt: "open-source black box recorder in primary copy",
      });
    }
  }

  if (rel.startsWith("launch/") && rel.endsWith(".md")) {
    const titleLine = lines.find((l) => l.toLowerCase().includes("title"));
    if (titleLine && /black box recorder/i.test(titleLine)) {
      findings.push({ file: rel, rule: "black box in launch title", excerpt: titleLine.trim() });
    }
  }

  if (rel === "packages/cli/package.json") {
    try {
      const pkg = JSON.parse(content) as { description?: string };
      if (pkg.description?.toLowerCase().includes("black box")) {
        findings.push({
          file: rel,
          rule: "black box in package description",
          excerpt: pkg.description,
        });
      }
    } catch {
      // ignore
    }
  }

  return findings;
}

export function runOssTrustScan(): Finding[] {
  const files = SCAN_TARGETS.flatMap(collectFiles);
  const findings: Finding[] = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, "utf8");
    findings.push(...scanContent(rel, content));
  }
  return findings;
}

function main(): void {
  console.log("OSS trust scan\n");
  const findings = runOssTrustScan();
  if (findings.length > 0) {
    console.error("FAIL: trust issues found:\n");
    for (const f of findings) {
      console.error(`  [${f.rule}] ${f.file}: ${f.excerpt}`);
    }
    process.exit(1);
  }
  console.log("[PASS] OSS trust scan clean");
}

main();