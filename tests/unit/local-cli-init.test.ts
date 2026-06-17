import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runInit } from "../../packages/cli/src/commands/init";
import { createTempProject } from "../helpers/tempProject";

describe("local cli init", () => {
  it("creates config, events journal, MCP config, and cursor rule", async () => {
    const { root, cleanup } = createTempProject();
    const prev = process.cwd();
    try {
      process.chdir(root);
      await runInit({ yes: true });

      expect(fs.existsSync(path.join(root, ".sortiri", "config.json"))).toBe(true);
      const config = JSON.parse(
        fs.readFileSync(path.join(root, ".sortiri", "config.json"), "utf8"),
      ) as { mode?: string };
      expect(config.mode).toBe("local");

      expect(fs.existsSync(path.join(root, ".sortiri", "events.jsonl"))).toBe(true);
      expect(fs.existsSync(path.join(root, ".cursor", "mcp.json"))).toBe(true);
      expect(fs.existsSync(path.join(root, ".cursor", "rules", "sortiri.mdc"))).toBe(true);

      const mcp = JSON.parse(
        fs.readFileSync(path.join(root, ".cursor", "mcp.json"), "utf8"),
      ) as { mcpServers?: { sortiri?: { args?: string[] } } };
      expect(mcp.mcpServers?.sortiri?.args).toContain("sortiri");
      expect(mcp.mcpServers?.sortiri?.args).toContain("mcp");
    } finally {
      process.chdir(prev);
      cleanup();
    }
  });
});
