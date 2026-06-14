import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ensureCursorSortiriRule,
  ensureGitignore,
  mergeCursorMcpConfig,
} from "../../packages/cli/src/lib/cursorSetup";
import { createTempProject } from "../helpers/tempProject";

describe("cursor setup helpers", () => {
  it("mergeCursorMcpConfig creates mcp.json and preserves existing servers", () => {
    const { root, cleanup } = createTempProject();
    try {
      const cursorDir = path.join(root, ".cursor");
      fs.mkdirSync(cursorDir, { recursive: true });
      fs.writeFileSync(
        path.join(cursorDir, "mcp.json"),
        JSON.stringify({ mcpServers: { existing: { command: "echo" } } }, null, 2),
      );

      mergeCursorMcpConfig(root);
      const parsed = JSON.parse(
        fs.readFileSync(path.join(cursorDir, "mcp.json"), "utf8"),
      ) as { mcpServers: Record<string, unknown> };

      expect(parsed.mcpServers.existing).toBeDefined();
      expect(parsed.mcpServers.sortiri).toBeDefined();
    } finally {
      cleanup();
    }
  });

  it("ensureCursorSortiriRule creates sortiri.mdc", () => {
    const { root, cleanup } = createTempProject();
    try {
      ensureCursorSortiriRule(root);
      expect(fs.existsSync(path.join(root, ".cursor", "rules", "sortiri.mdc"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("ensureGitignore adds sortiri entries", () => {
    const { root, cleanup } = createTempProject();
    try {
      ensureGitignore(root);
      const contents = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
      expect(contents).toContain(".sortiri/");
    } finally {
      cleanup();
    }
  });
});
