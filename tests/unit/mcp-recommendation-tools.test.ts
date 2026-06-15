import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SortiriApiClient } from "../../packages/mcp/src/client.js";

describe("mcp recommendation tools client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("lists recommendations via CLI route", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [{ id: "rec1", title: "Fix CI" }] }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.listRecommendations({ limit: 10 });
    expect(result.recommendations).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/cli/recommendations");
  });

  it("converts recommendation to workstream", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ workstreamId: "ws1", contextPackId: "pack1" }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.convertRecommendationToWorkstream("rec1");
    expect(result.workstreamId).toBe("ws1");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/convert");
  });
});
