import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SortiriApiClient } from "../../packages/mcp/src/client.js";

describe("mcp eval tools client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("lists eval suites via CLI route", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ suites: [{ id: "suite1", title: "Eval: Playbook" }] }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.listEvalSuites({ limit: 10 });
    expect(result.suites).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/evals");
  });

  it("generates eval suite from recommendation", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ suiteId: "suite1", created: true }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.generateEvalSuite({
      source: "recommendation",
      entityId: "rec1",
    });
    expect(result.suiteId).toBe("suite1");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/evals/generate");
  });

  it("queues eval run for suite", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ runId: "run1", cases: [] }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.runEvalSuite("suite1");
    expect(result.runId).toBe("run1");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/run");
  });

  it("fetches eval run detail", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ run: { id: "run1", status: "passed" } }),
    });

    const client = new SortiriApiClient({
      apiUrl: "https://example.com",
      apiKey: "key",
      workspaceId: "ws-ext",
      projectId: "",
    });

    const result = await client.getEvalRun("run1");
    expect(result.run).toBeTruthy();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/mcp/evals/runs/run1");
  });
});
