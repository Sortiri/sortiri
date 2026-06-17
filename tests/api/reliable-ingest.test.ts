import { describe, expect, it, vi } from "vitest";
import { readFailureInjection } from "../../src/lib/reliability/ingestPipeline";
import { buildReliabilityArgs } from "../../src/lib/sortiri/reliabilityAuth";

describe("reliable ingest API helpers", () => {
  it("disables failure injection in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SORTIRI_ENABLE_FAILURE_INJECTION", "true");

    const injection = readFailureInjection(
      new Request("http://localhost", {
        headers: { "x-sortiri-test-force-dead-letter": "true" },
      }),
    );
    expect(injection).toEqual({});
    vi.unstubAllEnvs();
  });

  it("honors failure injection headers in test mode", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SORTIRI_ENABLE_FAILURE_INJECTION", "true");

    const injection = readFailureInjection(
      new Request("http://localhost", {
        headers: {
          "x-sortiri-test-fail-journal-write": "true",
          "x-sortiri-test-force-dead-letter": "true",
        },
      }),
    );
    expect(injection.failJournalWrite).toBe(true);
    expect(injection.forceDeadLetter).toBe(true);
    vi.unstubAllEnvs();
  });

  it("builds ingest auth args for dev key flows", () => {
    expect(
      buildReliabilityArgs({ mode: "dev", rawKey: "sortiri-dev-ingest" }, "ws-test"),
    ).toEqual({
      workspaceId: "ws-test",
      ingestKey: "sortiri-dev-ingest",
    });
  });
});
