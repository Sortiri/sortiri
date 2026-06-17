import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("package metadata", () => {
  it("CLI package targets sortiri/sortiri with timeline layer description", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "packages/cli/package.json"), "utf8"),
    ) as {
      description?: string;
      repository?: { url?: string };
      homepage?: string;
      license?: string;
      keywords?: string[];
    };

    expect(pkg.repository?.url).toContain("github.com/sortiri/sortiri");
    expect(pkg.homepage).toBe("https://github.com/sortiri/sortiri#readme");
    expect(pkg.license).toBe("Apache-2.0");
    expect(pkg.description).toBe("Open-source timeline layer for AI-native companies.");
    expect(pkg.keywords).toContain("timeline");
    expect(pkg.keywords).not.toContain("black-box");
  });

  it("root package repository points to sortiri/sortiri", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      repository?: { url?: string };
    };
    expect(pkg.repository?.url).toContain("github.com/sortiri/sortiri");
  });
});
