import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SortiriApiClient } from "../../packages/mcp/src/client.js";

describe("mcp reliability tools client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("lists ingest deliveries via reliability route", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ deliveries: [{ id: "del1", status: "convex_written" }] }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.listIngestDeliveries({ status: "convex_written", limit: 10 });
    expect(result.deliveries).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/reliability");
  });

  it("fetches single ingest delivery", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ delivery: { id: "del1", journalRef: "ws/mcp/env.json" } }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.getIngestDelivery("del1");
    expect(result.delivery).toBeTruthy();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("deliveryId=del1");
  });

  it("lists dead letters", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ deadLetters: [{ id: "dl1", status: "open" }] }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.listDeadLetters({ status: "open" });
    expect(result.deadLetters).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/reliability/dead-letters");
  });

  it("replays ingest delivery", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "replayed", eventId: "evt1" }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.replayIngestDelivery({ deliveryId: "del1" });
    expect(result.status).toBe("replayed");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/reliability/replay");
  });

  it("fetches source delivery health", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ health: { cli: { health: "healthy" } } }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.getSourceHealth();
    expect(result.health.cli).toBeTruthy();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/reliability/health");
  });
});
