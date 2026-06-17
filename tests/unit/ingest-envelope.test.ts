import { describe, expect, it } from "vitest";
import {
  buildEnvelope,
  buildIdempotencyKey,
  normalizeIngestPayload,
  redactEnvelopePayload,
  resolveSourceEventId,
  truncatePayloadPreview,
} from "../../src/lib/reliability/eventEnvelope";

describe("ingest envelope", () => {
  it("builds stable idempotency keys", () => {
    const key = buildIdempotencyKey("ws1", "cli", "evt-1");
    expect(key).toBe("ws1:cli:evt-1");
  });

  it("resolves explicit source event ids", () => {
    expect(resolveSourceEventId("cli", "evt-42")).toBe("evt-42");
    expect(resolveSourceEventId("cli", "  evt-42  ")).toBe("evt-42");
  });

  it("generates source event id when omitted", () => {
    const id = resolveSourceEventId("cli");
    expect(id.startsWith("cli:")).toBe(true);
  });

  it("normalizes ingest payload with workspace id", () => {
    const normalized = normalizeIngestPayload("ws1", {
      source: "cli",
      category: "agent_action",
      type: "test",
      actor: { type: "agent", name: "Agent" },
      title: "Test event",
    });
    expect(normalized.workspaceId).toBe("ws1");
    expect(normalized.sourceEventId).toBeTruthy();
  });

  it("redacts sensitive payload fields", () => {
    const { redactedPayload, redaction } = redactEnvelopePayload({
      title: "Leak",
      token: "sk_live_fix2",
    });
    expect(redaction.scanned).toBe(true);
    expect(redaction.redacted).toBe(true);
    expect(JSON.stringify(redactedPayload)).not.toContain("sk_live_fix2");
  });

  it("builds envelope with metadata", () => {
    const envelope = buildEnvelope({
      workspaceId: "ws1",
      source: "cli",
      sourceEventId: "evt-1",
      payload: {
        source: "cli",
        category: "agent_action",
        type: "test",
        actor: { type: "agent", name: "Agent" },
        title: "Hello",
      },
      metadata: { route: "/ingest/events" },
    });
    expect(envelope.workspaceId).toBe("ws1");
    expect(envelope.idempotencyKey).toBe("ws1:cli:evt-1");
    expect(envelope.metadata?.route).toBe("/ingest/events");
  });

  it("truncates payload preview safely", () => {
    const preview = truncatePayloadPreview({ note: "x".repeat(400) }, 50);
    expect(preview.length).toBeLessThanOrEqual(51);
  });
});
