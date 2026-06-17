import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadConfigMock = vi.fn();

vi.mock("@sortiri/local", () => ({
  loadConfig: () => loadConfigMock(),
  loadCloudConfig: () => loadConfigMock(),
}));

describe("CLI eval remediation commands", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    loadConfigMock.mockReturnValue({
      mode: "cloud",
      apiUrl: "http://localhost:3000",
      apiKey: "sk_sortiri_test_key_1234567890",
      workspaceId: "ws_test",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("remediation list calls remediation route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remediations: [] }),
    });
    const { runEvals } = await import("../../packages/cli/src/commands/evals.js");
    await runEvals({ subcommand: "remediation-list" });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/cli/evals/remediation");
  });

  it("remediation generate requires run id", async () => {
    const { runEvals } = await import("../../packages/cli/src/commands/evals.js");
    const exit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit ${code}`);
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(runEvals({ subcommand: "remediation-generate" })).rejects.toThrow("exit 1");
    exit.mockRestore();
    error.mockRestore();
  });

  it("remediation generate posts eval run id", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recommendationIds: ["rec1"], count: 1 }),
    });
    const { runEvals } = await import("../../packages/cli/src/commands/evals.js");
    await runEvals({ subcommand: "remediation-generate", run: "run1" });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.evalRunId).toBe("run1");
  });

  it("remediation convert posts to recommendation convert route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workstreamId: "ws1" }),
    });
    const { runEvals } = await import("../../packages/cli/src/commands/evals.js");
    await runEvals({ subcommand: "remediation-convert", id: "rec1" });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/cli/recommendations/rec1/convert");
  });
});
