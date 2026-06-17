import { describe, expect, it } from "vitest";
import { mapObservabilityWebhook } from "../../convex/lib/integrations/observabilityMapWebhook";
import { parseObservabilityConfig } from "../../convex/lib/integrations/observabilityCaptureRules";
import { redactObservabilityPayload } from "../../convex/lib/observabilityRedaction";

describe("incident redaction safety", () => {
  const config = parseObservabilityConfig({});

  it("redacts bearer tokens from observability payloads", () => {
    const redacted = redactObservabilityPayload({
      title: "Error spike",
      authorization: "Bearer sk_live_fix3",
      headers: { "x-api-key": "secret-key-value" },
    }) as Record<string, unknown>;

    expect(JSON.stringify(redacted)).not.toContain("sk_live_");
    expect(JSON.stringify(redacted)).not.toContain("secret-key-value");
  });

  it("truncates long stack traces", () => {
    const stack = Array.from({ length: 20 }, (_, i) => `    at fn${i} (file.js:${i})`).join("\n");
    const redacted = redactObservabilityPayload({ stack_trace: stack }) as Record<string, unknown>;
    expect(String(redacted.stack_trace)).toContain("STACK_TRACE_TRUNCATED");
  });

  it("does not include raw secrets in mapped webhook metadata", () => {
    const payload = {
      source: "generic",
      signalType: "deploy_failed",
      title: "Deploy failed",
      api_key: "sk_live_fix4",
      severity: "error",
      service: "api",
    };

    const mapped = mapObservabilityWebhook(payload, config);
    if (mapped && !("blocked" in mapped)) {
      expect(JSON.stringify(mapped.data)).not.toContain("sk_live_");
    }
  });
});
