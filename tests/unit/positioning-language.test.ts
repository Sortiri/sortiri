import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");
const POSITIONING = "open-source timeline layer for ai-native companies";

describe("positioning language", () => {
  it("package description uses timeline layer positioning", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "packages/cli/package.json"), "utf8"),
    ) as { description?: string };
    expect(pkg.description?.toLowerCase()).toContain("timeline layer");
    expect(pkg.description?.toLowerCase()).not.toContain("black box");
  });

  it("Show HN title uses timeline layer positioning", () => {
    const hn = fs.readFileSync(path.join(ROOT, "launch/show-hn.md"), "utf8");
    expect(hn.toLowerCase()).toContain(POSITIONING);
    expect(hn).not.toMatch(/title:.*black box recorder/i);
  });

  it("X hook uses timeline layer positioning", () => {
    const x = fs.readFileSync(path.join(ROOT, "launch/x-thread.md"), "utf8");
    expect(x.toLowerCase()).toContain("ai-native companies need a timeline");
    expect(x.split("\n").slice(0, 15).join("\n").toLowerCase()).not.toContain(
      "black box recorder",
    );
  });

  it("allows black box only as optional metaphor in founder comment", () => {
    const founder = fs.readFileSync(path.join(ROOT, "launch/founder-comment.md"), "utf8");
    expect(founder.toLowerCase()).toContain("black box recorder");
    expect(founder.toLowerCase()).toContain("product category is the timeline layer");
  });
});
