import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  normalizeObservabilityPayload,
  parseGenericObservabilityJson,
} from "../../convex/lib/observabilityNormalization";

const FIXTURES = path.join(process.cwd(), "tests/fixtures/observability");

function loadFixture(name: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));
}

describe("observability normalization", () => {
  it("parses JSON string payloads", () => {
    const record = parseGenericObservabilityJson('{"title":"Alert","severity":"error"}');
    expect(record.title).toBe("Alert");
  });

  it("normalizes generic incident_opened fixtures", () => {
    const payload = loadFixture("incident_opened.json");
    const normalized = normalizeObservabilityPayload("generic", payload);
    expect(normalized.signalType).toBe("incident_opened");
    expect(normalized.severity).toBe("critical");
    expect(normalized.service).toBe("api");
    expect(normalized.visibility).toBe("primary");
  });

  it("normalizes vercel deploy_failed fixtures", () => {
    const payload = loadFixture("deploy_failed.json");
    const normalized = normalizeObservabilityPayload("vercel", payload);
    expect(normalized.signalType).toBe("deploy_failed");
    expect(normalized.severity).toBe("error");
    expect(normalized.service).toBe("api");
    expect(normalized.importance).toBe("high");
  });

  it("normalizes rollback_completed fixtures", () => {
    const payload = loadFixture("rollback_completed.json");
    const normalized = normalizeObservabilityPayload("generic", payload);
    expect(normalized.signalType).toBe("rollback_completed");
    expect(normalized.title).toContain("Rollback");
  });

  it("normalizes incident_resolved fixtures", () => {
    const payload = loadFixture("incident_resolved.json");
    const normalized = normalizeObservabilityPayload("generic", payload);
    expect(normalized.signalType).toBe("incident_resolved");
    expect(normalized.fingerprint).toBe("api-latency-spike");
  });

  it("normalizes sentry exception payloads", () => {
    const normalized = normalizeObservabilityPayload("sentry", {
      level: "error",
      event_id: "evt_sentry_1",
      exception: { values: [{ value: "TypeError: boom" }] },
      project: "api",
      environment: "production",
    });
    expect(normalized.source).toBe("sentry");
    expect(normalized.signalType).toBe("error");
    expect(normalized.title).toBe("TypeError: boom");
  });

  it("normalizes datadog alert payloads", () => {
    const normalized = normalizeObservabilityPayload("datadog", {
      alert_type: "error",
      title: "High error rate",
      tags: ["service:api", "env:production"],
      alert_id: "dd_alert_1",
    });
    expect(normalized.source).toBe("datadog");
    expect(normalized.service).toBe("api");
    expect(normalized.environment).toBe("production");
  });

  it("redacts sensitive metadata during normalization", () => {
    const normalized = normalizeObservabilityPayload("generic", {
      title: "Error spike",
      severity: "error",
      api_key: "sk_live_fix5",
    });
    expect(JSON.stringify(normalized.metadata)).not.toContain("sk_live_fix5");
  });
});
