import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("github infra config", () => {
  it("targets sortiri/sortiri org repo in scripts and package metadata", () => {
    const infra = fs.readFileSync(
      path.join(ROOT, "scripts/setup-github-open-source-infra.ts"),
      "utf8",
    );
    expect(infra).toContain("GITHUB_ORG");
    expect(infra).toContain('"sortiri"');

    const cliPkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "packages/cli/package.json"), "utf8"),
    ) as { repository?: { url?: string } };
    expect(cliPkg.repository?.url).toContain("github.com/sortiri/sortiri");

    const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      repository?: { url?: string };
    };
    expect(rootPkg.repository?.url).toContain("github.com/sortiri/sortiri");
  });
});
