import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SortiriApiClient } from "../../packages/mcp/src/client.js";

describe("mcp context tools client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("creates context pack via CLI route", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        contextPackId: "pack1",
        summary: "summary",
        text: "CONTEXT PACK",
        counts: { lessons: 1 },
      }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.createContextPack({ goal: "Fix checkout" });
    expect(result.contextPackId).toBe("pack1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/mcp/context/packs",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fetches context pack by id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ text: "CONTEXT PACK", pack: {}, items: [] }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.getContextPack("pack1");
    expect(result.text).toContain("CONTEXT PACK");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/context/packs/pack1");
  });
});
