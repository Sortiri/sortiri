import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@sortiri/local", () => ({
  loadConfig: () => ({
    mode: "cloud",
    apiUrl: "https://example.com",
    apiKey: "key",
    workspaceId: "ws-ext",
  }),
  loadCloudConfig: () => ({
    mode: "cloud",
    apiUrl: "https://example.com",
    apiKey: "key",
    workspaceId: "ws-ext",
  }),
}));

describe("evals cli", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    fetchMock.mockReset();
  });

  it("lists eval suites", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ suites: [] }),
    });

    const { runEvals } = await import("../../packages/cli/src/commands/evals.js");
    await runEvals({ subcommand: "list" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/cli/evals");
  });

  it("generates eval suite from entity", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ suiteId: "suite1", created: true }),
    });

    const { runEvals } = await import("../../packages/cli/src/commands/evals.js");
    await runEvals({
      subcommand: "generate",
      source: "recommendation",
      entityId: "rec1",
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/cli/evals/generate");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.source).toBe("recommendation");
    expect(body.entityId).toBe("rec1");
  });

  it("gets eval run by id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ run: { id: "run1" } }),
    });

    const { runEvals } = await import("../../packages/cli/src/commands/evals.js");
    await runEvals({ subcommand: "get-run", id: "run1" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/cli/evals/runs/run1");
  });
});
