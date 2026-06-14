import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { saveConfig, loadConfig } from "../../packages/sortiri-local/src/config";
import { createTempProject } from "../helpers/tempProject";

describe("sortiri config", () => {
  it("saves and loads config from .sortiri/config.json", () => {
    const { root, cleanup } = createTempProject();
    const prevWorkspaceId = process.env.SORTIRI_WORKSPACE_ID;
    const prevApiUrl = process.env.SORTIRI_API_URL;
    const prevApiKey = process.env.SORTIRI_API_KEY;
    delete process.env.SORTIRI_WORKSPACE_ID;
    delete process.env.SORTIRI_API_URL;
    delete process.env.SORTIRI_API_KEY;
    try {
      saveConfig(
        {
          apiUrl: "http://localhost:3000",
          apiKey: "sortiri_test_key",
          workspaceId: "ws-test",
          projectId: null,
        },
        root,
      );

      const config = loadConfig(root);
      expect(config.apiUrl).toBe("http://localhost:3000");
      expect(config.workspaceId).toBe("ws-test");
      expect(fs.existsSync(path.join(root, ".sortiri", "config.json"))).toBe(true);
    } finally {
      if (prevWorkspaceId) {
        process.env.SORTIRI_WORKSPACE_ID = prevWorkspaceId;
      }
      if (prevApiUrl) {
        process.env.SORTIRI_API_URL = prevApiUrl;
      }
      if (prevApiKey) {
        process.env.SORTIRI_API_KEY = prevApiKey;
      }
      cleanup();
    }
  });
});
