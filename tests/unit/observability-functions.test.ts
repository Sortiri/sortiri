import { describe, expect, it } from "vitest";
import {
  parseObservabilityConfig,
  shouldAcceptObservabilitySignal,
  timelineVisibilityForSignal,
} from "../../convex/lib/integrations/observabilityCaptureRules";
import { normalizeObservabilityPayload } from "../../convex/lib/observabilityNormalization";

describe("observability functions", () => {
  it("parses allowed service and environment filters", () => {
    const config = parseObservabilityConfig({
      allowedServices: ["api"],
      allowedEnvironments: ["production"],
    });
    expect(config.allowedServices).toEqual(["api"]);
    expect(config.allowedEnvironments).toEqual(["production"]);
  });

  it("blocks signals outside allowed services", () => {
    const config = parseObservabilityConfig({ allowedServices: ["api"] });
    const signal = normalizeObservabilityPayload("generic", {
      title: "Alert",
      severity: "error",
      service: "billing",
    });
    expect(shouldAcceptObservabilitySignal(config, signal)).toBe("blocked");
  });

  it("accepts signals matching allowed services", () => {
    const config = parseObservabilityConfig({ allowedServices: ["api"] });
    const signal = normalizeObservabilityPayload("generic", {
      title: "Alert",
      severity: "error",
      service: "api",
    });
    expect(shouldAcceptObservabilitySignal(config, signal)).toBe("accept");
  });

  it("elevates visibility for incident and deploy failure signals", () => {
    const signal = normalizeObservabilityPayload("generic", {
      signalType: "incident_opened",
      title: "Outage",
      severity: "critical",
      service: "api",
    });
    const display = timelineVisibilityForSignal(signal);
    expect(display.visibility).toBe("primary");
    expect(display.importance).toBe("critical");
  });

  it("elevates deploy_failed importance", () => {
    const signal = normalizeObservabilityPayload("generic", {
      signalType: "deploy_failed",
      title: "Deploy failed",
      severity: "error",
      service: "api",
    });
    const display = timelineVisibilityForSignal(signal);
    expect(display.visibility).toBe("primary");
    expect(display.importance).toBe("high");
  });
});
