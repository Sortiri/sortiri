import { describe, expect, it } from "vitest";
import {
  buildIdempotencyKey,
  buildJournalRef,
  normalizeIngestPayload,
} from "../../convex/lib/ingestEnvelope";

describe("ingestEnvelope", () => {
  it("builds stable idempotency keys", () => {
    expect(buildIdempotencyKey("ws1", "cli", "evt-1")).toBe("ws1:cli:evt-1");
  });

  it("normalizes payload with sourceEventId", () => {
    const normalized = normalizeIngestPayload("ws1", {
      source: "cli",
      category: "agent_action",
      type: "test",
      actor: { type: "agent", name: "Test" },
      title: "Hello",
      sourceEventId: "abc",
    });
    expect(normalized.sourceEventId).toBe("abc");
    expect(normalized.workspaceId).toBe("ws1");
  });

  it("builds convex journal refs", () => {
    expect(buildJournalRef("env-123")).toBe("convex:journal:env-123");
  });
});
