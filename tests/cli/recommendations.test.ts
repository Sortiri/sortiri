import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("recommendations cli", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.mock("@sortiri/local", () => ({
      loadConfig: () => ({
        apiUrl: "https://example.com",
        apiKey: "key",
        workspaceId: "ws-ext",
      }),
    }));
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
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/cli/recommendations");
  });
});
