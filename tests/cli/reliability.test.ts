import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadConfigMock = vi.fn();

vi.mock("@sortiri/local", () => ({
  loadConfig: () => loadConfigMock(),
  loadCloudConfig: () => loadConfigMock(),
}));

describe("CLI reliability commands", () => {
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

  it("deliveries calls reliability route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ deliveries: [] }),
    });
    const { runReliability } = await import("../../packages/cli/src/commands/reliability.js");
    await runReliability({ subcommand: "deliveries", status: "retry_pending" });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/cli/reliability");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("status=retry_pending");
  });

  it("dead-letters calls dead-letters route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ deadLetters: [] }),
    });
    const { runReliability } = await import("../../packages/cli/src/commands/reliability.js");
    await runReliability({ subcommand: "dead-letters" });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/cli/reliability/dead-letters");
  });

  it("replay requires delivery or dead-letter id", async () => {
    const { runReliability } = await import("../../packages/cli/src/commands/reliability.js");
    const exit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit ${code}`);
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(runReliability({ subcommand: "replay" })).rejects.toThrow("exit 1");
    exit.mockRestore();
    error.mockRestore();
  });

  it("replay posts delivery id", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "replayed", eventId: "evt1" }),
    });
    const { runReliability } = await import("../../packages/cli/src/commands/reliability.js");
    await runReliability({ subcommand: "replay", deliveryId: "del1" });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.deliveryId).toBe("del1");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/cli/reliability/replay");
  });

  it("journal-list calls journal list route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [] }),
    });
    const { runReliability } = await import("../../packages/cli/src/commands/reliability.js");
    await runReliability({ subcommand: "journal-list", source: "cli" });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/cli/reliability/journal/list");
  });
});
