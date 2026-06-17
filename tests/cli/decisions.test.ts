import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const cloudConfig = {
  mode: "cloud" as const,
  apiUrl: "https://example.convex.site",
  apiKey: "key",
  workspaceId: "ws-ext",
};

vi.mock("@sortiri/local", () => ({
  loadConfig: () => cloudConfig,
  loadCloudConfig: () => cloudConfig,
}));

describe("decisions cli", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    fetchMock.mockReset();
  });

  it("records decisions via convex http", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "dec1" }),
    });

    const { runDecisions } = await import("../../packages/cli/src/commands/decisions.js");
    await runDecisions({ subcommand: "record", title: "Ship v1" });
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("example.convex.site");
    expect(url).not.toContain("localhost");
    expect(url).toContain("/cli/decisions");
  });

  it("lists decisions", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ decisions: [] }),
    });

    const { runDecisions } = await import("../../packages/cli/src/commands/decisions.js");
    await runDecisions({ subcommand: "list" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/cli/decisions");
  });
});
