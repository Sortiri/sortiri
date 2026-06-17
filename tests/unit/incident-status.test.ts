import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mapObservabilityWebhook } from "../../convex/lib/integrations/observabilityMapWebhook";
import { parseObservabilityConfig } from "../../convex/lib/integrations/observabilityCaptureRules";
import { docToIncident } from "../../convex/lib/incidentsLib";

const FIXTURES = path.join(process.cwd(), "tests/fixtures/observability");

describe("incident status", () => {
  const config = parseObservabilityConfig({});

  it("maps incident_opened to incident.opened event type", () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(FIXTURES, "incident_opened.json"), "utf8"),
    );
    const mapped = mapObservabilityWebhook(payload, config);
    expect(mapped && !("blocked" in mapped) ? mapped.type : null).toBe("incident.opened");
  });

  it("maps deploy_failed to deploy.failed event type", () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(FIXTURES, "deploy_failed.json"), "utf8"),
    );
    const mapped = mapObservabilityWebhook(payload, config);
    expect(mapped && !("blocked" in mapped) ? mapped.type : null).toBe("deploy.failed");
  });

  it("maps rollback_completed to rollback.completed event type", () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(FIXTURES, "rollback_completed.json"), "utf8"),
    );
    const mapped = mapObservabilityWebhook(payload, config);
    expect(mapped && !("blocked" in mapped) ? mapped.type : null).toBe("rollback.completed");
  });

  it("maps incident_resolved to incident.resolved event type", () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(FIXTURES, "incident_resolved.json"), "utf8"),
    );
    const mapped = mapObservabilityWebhook(payload, config);
    expect(mapped && !("blocked" in mapped) ? mapped.type : null).toBe("incident.resolved");
  });

  it("preserves resolvedAt on terminal incident docs", () => {
    const record = docToIncident({
      _id: "inc1",
      _creationTime: 1,
      workspaceId: "ws1",
      title: "API outage",
      status: "resolved",
      severity: "critical",
      source: "observability",
      startedAt: 100,
      resolvedAt: 500,
      createdAt: 100,
      updatedAt: 500,
    } as never);

    expect(record.status).toBe("resolved");
    expect(record.resolvedAt).toBe(500);
  });
});
