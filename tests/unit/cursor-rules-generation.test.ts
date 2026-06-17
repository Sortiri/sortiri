import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ensureCursorSortiriRule,
  getSortiriRuleContent,
} from "../../packages/cli/src/lib/cursorSetup";
import { createTempProject } from "../helpers/tempProject";

describe("cursor rules generation", () => {
  it("creates sortiri.mdc with workstream guidance", () => {
    const { root, cleanup } = createTempProject();
    try {
      ensureCursorSortiriRule(root, true);
      const rule = fs.readFileSync(
        path.join(root, ".cursor", "rules", "sortiri.mdc"),
        "utf8",
      );
      expect(rule).toContain("start_workstream");
      expect(rule).toContain("finish_workstream");
      expect(rule).toContain("sortiri export");
      expect(getSortiriRuleContent().length).toBeGreaterThan(100);
    } finally {
      cleanup();
    }
  });
});
