import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("open-source README", () => {
  it("positions Sortiri as open-source timeline layer", () => {
    const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
    expect(readme).toMatch(/# Sortiri/i);
    expect(readme.toLowerCase()).toContain("open-source timeline layer for ai-native companies");
    expect(readme).toContain("npx sortiri init");
    expect(readme).toContain("sortiri dev");
    expect(readme).toContain("Open Source vs Cloud");
    expect(readme.toLowerCase()).not.toContain("soc 2 certified");
    expect(readme).not.toMatch(/\d+\s*stars/i);
    const top = readme.split("\n").slice(0, 8).join("\n").toLowerCase();
    expect(top).not.toContain("black box recorder");
  });
});
