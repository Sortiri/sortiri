import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runExport } from "../../packages/cli/src/commands/export";
import { runInit } from "../../packages/cli/src/commands/init";
import { runRecord } from "../../packages/cli/src/commands/record";
import { createTempProject } from "../helpers/tempProject";

describe("local cli record and export", () => {
  it("appends events and exports JSONL", async () => {
    const { root, cleanup } = createTempProject();
    const prev = process.cwd();
    try {
      process.chdir(root);
      await runInit({ yes: true });
      await runRecord({
        type: "agent.action",
        title: "Updated onboarding flow",
        summary: "Test event",
      });

      const journal = fs.readFileSync(path.join(root, ".sortiri", "events.jsonl"), "utf8");
      expect(journal).toContain("Updated onboarding flow");

      const outPath = path.join(root, "export.jsonl");
      await runExport({ out: outPath });
      expect(fs.existsSync(outPath)).toBe(true);
      expect(fs.readFileSync(outPath, "utf8")).toContain("Updated onboarding flow");
    } finally {
      process.chdir(prev);
      cleanup();
    }
  });
});
