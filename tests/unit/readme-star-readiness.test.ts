import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");

function first500Words(text: string): string {
  return text.split(/\s+/).slice(0, 500).join(" ");
}

describe("README star readiness", () => {
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const aboveFold = first500Words(readme).toLowerCase();

  it("includes timeline-layer positioning above fold", () => {
    expect(aboveFold).toContain("open-source timeline layer for ai-native companies");
  });

  it("includes npx sortiri init above fold", () => {
    expect(aboveFold).toContain("npx sortiri init");
  });

  it("includes local-first or local timeline above fold", () => {
    expect(
      aboveFold.includes("local-first") || aboveFold.includes("local timeline"),
    ).toBe(true);
  });

  it("references demo hero asset", () => {
    expect(readme).toContain("assets/readme-hero.png");
  });

  it("includes Open Source vs Cloud section", () => {
    expect(readme).toContain("Open Source vs Cloud");
  });

  it("does not use black box recorder as main subtitle", () => {
    const top = readme.split("\n").slice(0, 10).join("\n").toLowerCase();
    expect(top).not.toContain("black box recorder");
  });

  it("includes star CTA", () => {
    expect(readme.toLowerCase()).toContain("star sortiri");
  });
});
