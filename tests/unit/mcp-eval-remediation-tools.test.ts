import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SortiriApiClient } from "../../packages/mcp/src/client.js";

describe("MCP eval remediation tools client", () => {
  const fetchMock = vi.fn();
  const config = {
    apiUrl: "http://localhost:3000",
    apiKey: "sk_sortiri_test_key_1234567890",
    workspaceId: "ws_test",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generateRemediationFromEval posts to remediation generate route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recommendationIds: ["rec1"], count: 1 }),
    });
    const client = new SortiriApiClient(config);
    const result = await client.generateRemediationFromEval("run1");
    expect(result.count).toBe(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/cli/evals/remediation/generate");
  });

  it("listEvalRemediations fetches remediation list", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remediations: [{ id: "rec1" }] }),
    });
    const client = new SortiriApiClient(config);
    const result = await client.listEvalRemediations({ limit: 5 });
    expect(result.remediations).toHaveLength(1);
  });

  it("getEvalRemediation fetches remediation by id", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "rec1", evalSuiteId: "suite1" }),
    });
    const client = new SortiriApiClient(config);
    const result = await client.getEvalRemediation("rec1");
    expect(result.evalSuiteId).toBe("suite1");
  });

  it("convertRemediationToWorkstream posts convert route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workstreamId: "ws1", contextPackId: "cp1" }),
    });
    const client = new SortiriApiClient(config);
    const result = await client.convertRemediationToWorkstream("rec1");
    expect(result.workstreamId).toBe("ws1");
  });

  it("rerunEvalForRemediation resolves eval suite from recommendation", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ evalSuiteId: "suite1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: "run2" }),
      });
    const client = new SortiriApiClient(config);
    const result = await client.rerunEvalForRemediation({ recommendationId: "rec1" });
    expect(result.runId).toBe("run2");
  });
});
