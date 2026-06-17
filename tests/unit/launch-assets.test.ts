import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("launch assets", () => {
  it("includes social preview and readme hero PNGs", () => {
    for (const file of ["assets/github-social-preview.png", "assets/readme-hero.png"]) {
      const full = path.join(ROOT, file);
      expect(fs.existsSync(full)).toBe(true);
      expect(fs.statSync(full).size).toBeGreaterThan(1000);
    }
  });

  it("includes required launch markdown drafts", () => {
    for (const file of [
      "launch/show-hn.md",
      "launch/x-thread.md",
      "launch/reddit-post.md",
      "launch/linkedin-post.md",
      "launch/founder-comment.md",
      "launch/good-first-issues.md",
      "launch/launch-checklist.md",
      "launch/demo-script.md",
      "launch/demo-shot-list.md",
      "launch/demo-terminal-flow.md",
    ]) {
      expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
    }
  });
});
