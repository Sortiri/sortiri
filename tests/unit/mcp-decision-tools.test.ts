import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SortiriApiClient } from "../../packages/mcp/src/client.js";

describe("mcp decision tools client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("records decisions via /mcp/decisions", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "dec1" }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.convex.site",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    await client.recordDecision({ title: "Ship Slack v1" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/decisions");
  });

  it("lists candidates", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.convex.site",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    await client.listDecisionCandidates();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/decisions/candidates");
  });
});
