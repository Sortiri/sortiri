import { describe, expect, it } from "vitest";
import {
  redactEnvelopePayload,
  truncatePayloadPreview,
} from "../../src/lib/reliability/eventEnvelope";

function assertNoSecrets(text: string): void {
  if (/sk_sortiri_[a-f0-9]{8,}/i.test(text)) {
    throw new Error("Raw API key found in output");
  }
  if (/sk_live_[a-z0-9]{10,}/i.test(text)) {
    throw new Error("Raw secret-like token found in output");
  }
}

describe("reliability safety", () => {
  it("redacts secrets in envelope payload", () => {
    const { redactedPayload, redaction } = redactEnvelopePayload({
      summary: "Used sk_live_fix1 in command",
    });
    expect(redaction.redacted).toBe(true);
    expect(JSON.stringify(redactedPayload)).not.toContain("sk_live_fix1");
  });

  it("truncates preview without leaking secrets", () => {
    const preview = truncatePayloadPreview({
      cmd: "curl -H 'Authorization: Bearer sk_sortiri_deadbeefcafebabe'",
    });
    assertNoSecrets(preview);
    expect(preview).not.toContain("sk_sortiri_deadbeefcafebabe");
  });

  it("passes assertNoSecrets for benign output", () => {
    expect(() => assertNoSecrets('{"status":"convex_written"}')).not.toThrow();
  });
});
