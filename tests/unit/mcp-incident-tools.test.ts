import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SortiriApiClient } from "../../packages/mcp/src/client.js";

describe("mcp incident tools client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("records incidents via /mcp/incidents", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "inc1" }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.convex.site",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    await client.recordIncident({ title: "API deploy failed" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/incidents");
  });

  it("lists incidents", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ incidents: [] }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.convex.site",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    await client.listIncidents({ limit: 5 });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/incidents");
  });

  it("gets incident by id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "inc1", title: "Outage" }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.convex.site",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    await client.getIncident("inc1");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/incidents/inc1");
  });

  it("resolves incidents", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "inc1", status: "resolved" }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.convex.site",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    await client.resolveIncident({
      incidentId: "inc1",
      rootCause: "Bad deploy",
      mitigation: "Rollback",
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/incidents/inc1/resolve");
  });

  it("lists observability signals", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ signals: [] }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.convex.site",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    await client.listObservabilitySignals({ limit: 5 });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/incidents/signals");
  });
});
