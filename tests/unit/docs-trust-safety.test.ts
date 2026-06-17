import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");

const SCAN_DIRS = ["docs", "launch", "examples", "README.md", "CONTRIBUTING.md", "SECURITY.md"];

const BANNED: Array<{ pattern: RegExp; allowNegation?: boolean }> = [
  { pattern: /soc\s*2\s*certified/i },
  { pattern: /compliance[- ]ready/i, allowNegation: true },
  { pattern: /\d{1,3}\s*github\s*stars/i, allowNegation: true },
  { pattern: /sk_sortiri_[a-z0-9]+/i },
];

function collectFiles(target: string): string[] {
  const full = path.join(ROOT, target);
  if (!fs.existsSync(full)) return [];
  const stat = fs.statSync(full);
  if (stat.isFile()) return [full];
  const out: string[] = [];
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const child = path.join(full, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(path.relative(ROOT, child)));
    else if (/\.(md|mdc|jsonl|json|txt)$/i.test(entry.name)) out.push(child);
  }
  return out;
}

describe("docs trust safety", () => {
  it("avoids fake compliance claims, stars, and secrets in docs/examples", () => {
    const files = SCAN_DIRS.flatMap(collectFiles);
    expect(files.length).toBeGreaterThan(5);

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      for (const { pattern, allowNegation } of BANNED) {
        if (!pattern.test(content) || file.endsWith("github-org-privacy.md")) continue;
        if (allowNegation) {
          const lines = content.split("\n").filter((line) => pattern.test(line));
          const positive = lines.filter((line) => !/\bno\b|\bnot\b|\bnever\b|\bavoid\b/i.test(line));
          expect(positive).toEqual([]);
        } else {
          expect(content).not.toMatch(pattern);
        }
      }
    }
  });
});
