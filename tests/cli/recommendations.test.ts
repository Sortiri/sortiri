import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const cloudConfig = {
  mode: "cloud" as const,
  apiUrl: "https://example.com",
  apiKey: "key",
  workspaceId: "ws-ext",
};

vi.mock("@sortiri/local", () => ({
  loadConfig: () => cloudConfig,
  loadCloudConfig: () => cloudConfig,
}));

describe("recommendations cli", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    fetchMock.mockReset();
  });

  it("lists recommendations", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [] }),
    });

    const { runRecommendations } = await import("../../packages/cli/src/commands/recommendations.js");
    await runRecommendations({ subcommand: "list" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/cli/recommendations");
  });
});
