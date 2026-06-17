import type { NormalizedObservabilitySignal } from "../observabilityNormalization";

export type ObservabilityConfig = {
  allowedServices?: string[];
  allowedEnvironments?: string[];
};

export function parseObservabilityConfig(metadata: unknown): ObservabilityConfig {
  if (!metadata || typeof metadata !== "object") return {};
  const record = metadata as Record<string, unknown>;
  const allowedServices = Array.isArray(record.allowedServices)
    ? record.allowedServices.map(String).filter(Boolean)
    : undefined;
  const allowedEnvironments = Array.isArray(record.allowedEnvironments)
    ? record.allowedEnvironments.map(String).filter(Boolean)
    : undefined;
  return { allowedServices, allowedEnvironments };
}

export function shouldAcceptObservabilitySignal(
  config: ObservabilityConfig,
  signal: Pick<
    NormalizedObservabilitySignal,
    "service" | "environment" | "severity" | "signalType"
  >,
): "accept" | "blocked" {
  if (config.allowedServices?.length) {
    if (!signal.service || !config.allowedServices.includes(signal.service)) {
      return "blocked";
    }
  }
  if (config.allowedEnvironments?.length) {
    if (!signal.environment || !config.allowedEnvironments.includes(signal.environment)) {
      return "blocked";
    }
  }
  return "accept";
}

export function timelineVisibilityForSignal(
  signal: Pick<NormalizedObservabilitySignal, "signalType" | "severity" | "visibility" | "importance">,
): { visibility: NormalizedObservabilitySignal["visibility"]; importance: NormalizedObservabilitySignal["importance"] } {
  const highSignalTypes = new Set([
    "incident_opened",
    "incident_updated",
    "incident_resolved",
    "deploy_failed",
    "rollback_started",
    "rollback_completed",
    "service_degraded",
    "service_recovered",
  ]);
  if (highSignalTypes.has(signal.signalType)) {
    return {
      visibility: "primary",
      importance: signal.signalType.includes("failed") || signal.signalType.includes("rollback")
        ? "high"
        : signal.severity === "critical"
          ? "critical"
          : "high",
    };
  }
  if (signal.severity === "critical" || signal.severity === "error") {
    return { visibility: "primary", importance: signal.severity === "critical" ? "critical" : "high" };
  }
  return { visibility: signal.visibility, importance: signal.importance };
}
