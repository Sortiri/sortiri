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

describe("incidents cli", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    fetchMock.mockReset();
  });

  it("records incidents via convex http", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "inc1" }),
    });

    const { runIncidents } = await import("../../packages/cli/src/commands/incidents.js");
    await runIncidents({ subcommand: "record", title: "API deploy failed" });
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("example.convex.site");
    expect(url).not.toContain("localhost");
    expect(url).toContain("/cli/incidents");
  });

  it("lists incidents", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ incidents: [] }),
    });

    const { runIncidents } = await import("../../packages/cli/src/commands/incidents.js");
    await runIncidents({ subcommand: "list" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/cli/incidents");
  });

  it("gets incident by id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "inc1", title: "Outage" }),
    });

    const { runIncidents } = await import("../../packages/cli/src/commands/incidents.js");
    await runIncidents({ subcommand: "get", id: "inc1" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/cli/incidents/inc1");
  });

  it("resolves incidents", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "inc1", status: "resolved" }),
    });

    const { runIncidents } = await import("../../packages/cli/src/commands/incidents.js");
    await runIncidents({
      subcommand: "resolve",
      id: "inc1",
      rootCause: "Bad deploy",
      mitigation: "Rollback",
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/cli/incidents/inc1/resolve");
  });

  it("sends signed observability test webhook", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const prev = process.env.SORTIRI_OBSERVABILITY_SIGNING_SECRET;
    process.env.SORTIRI_OBSERVABILITY_SIGNING_SECRET = "test-secret";

    const { runObservabilityTestWebhook } = await import(
      "../../packages/cli/src/commands/incidents.js"
    );
    await runObservabilityTestWebhook();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/webhooks/observability");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["x-sortiri-request-timestamp"]).toBeTruthy();
    expect(headers["x-sortiri-signature"]).toMatch(/^v0=/);

    if (prev === undefined) {
      delete process.env.SORTIRI_OBSERVABILITY_SIGNING_SECRET;
    } else {
      process.env.SORTIRI_OBSERVABILITY_SIGNING_SECRET = prev;
    }
  });
});
