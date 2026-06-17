import { describe, expect, it } from "vitest";
import { docToIncident } from "../../convex/lib/incidentsLib";
import { docToObservabilitySignal } from "../../convex/lib/observabilitySignalsLib";
import { buildProjectPulseCounts } from "../../convex/lib/projectPulse";

describe("incident functions", () => {
  it("maps incident docs to records", () => {
    const record = docToIncident({
      _id: "inc1",
      _creationTime: 1,
      workspaceId: "ws1",
      title: "API deploy failed",
      status: "investigating",
      severity: "error",
      source: "manual",
      service: "api",
      environment: "production",
      startedAt: 100,
      createdAt: 100,
      updatedAt: 100,
    } as never);

    expect(record.status).toBe("investigating");
    expect(record.service).toBe("api");
  });

  it("maps observability signal docs to records", () => {
    const record = docToObservabilitySignal({
      _id: "sig1",
      _creationTime: 1,
      workspaceId: "ws1",
      source: "generic",
      signalType: "deploy_failed",
      severity: "error",
      title: "Deploy failed",
      service: "api",
      occurredAt: 200,
      createdAt: 200,
      updatedAt: 200,
    } as never);

    expect(record.signalType).toBe("deploy_failed");
    expect(record.source).toBe("generic");
  });

  it("counts incidents in project pulse", () => {
    const counts = buildProjectPulseCounts([], [], {
      incidents: 3,
      deployFailures: 2,
      rollbacks: 1,
    });
    expect(counts.incidents).toBe(3);
    expect(counts.deployFailures).toBe(2);
    expect(counts.rollbacks).toBe(1);
  });
});
