import { describe, expect, it } from "vitest";
import { mergeCursorMcpConfig } from "../../packages/cli/src/lib/cursorSetup";
import { createTempProject } from "../helpers/tempProject";
import fs from "node:fs";
import path from "node:path";

describe("mcp config generation", () => {
  it("writes portable npx sortiri mcp config", () => {
    const { root, cleanup } = createTempProject();
    try {
      mergeCursorMcpConfig(root);
      const parsed = JSON.parse(
        fs.readFileSync(path.join(root, ".cursor", "mcp.json"), "utf8"),
      ) as {
        mcpServers: { sortiri: { command: string; args: string[] } };
      };
      expect(parsed.mcpServers.sortiri.command).toBe("npx");
      expect(parsed.mcpServers.sortiri.args).toEqual(["sortiri", "mcp"]);
    } finally {
      cleanup();
    }
  });
});
