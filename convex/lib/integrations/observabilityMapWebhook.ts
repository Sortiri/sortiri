import type { Doc } from "../../_generated/dataModel";
import {
  normalizeObservabilityPayload,
  type NormalizedObservabilitySignal,
} from "../observabilityNormalization";
import {
  parseObservabilityConfig,
  shouldAcceptObservabilitySignal,
  timelineVisibilityForSignal,
  type ObservabilityConfig,
} from "./observabilityCaptureRules";

export type MappedObservabilityWebhook =
  | { blocked: true }
  | {
      source: Doc<"observabilitySignals">["source"];
      sourceEventId: string;
      category: "observability";
      type: string;
      actor: { type: "system"; name: string };
      title: string;
      summary?: string;
      data: Record<string, unknown>;
      occurredAt: number;
      visibility: NormalizedObservabilitySignal["visibility"];
      importance: NormalizedObservabilitySignal["importance"];
      normalized: NormalizedObservabilitySignal;
    };

function eventTypeForSignal(signalType: NormalizedObservabilitySignal["signalType"]): string {
  switch (signalType) {
    case "incident_opened":
      return "incident.opened";
    case "incident_updated":
      return "incident.updated";
    case "incident_resolved":
      return "incident.resolved";
    case "deploy_started":
      return "deploy.started";
    case "deploy_succeeded":
      return "deploy.succeeded";
    case "deploy_failed":
      return "deploy.failed";
    case "rollback_started":
      return "rollback.started";
    case "rollback_completed":
      return "rollback.completed";
    case "service_degraded":
      return "service.degraded";
    case "service_recovered":
      return "service.recovered";
    default:
      return "observability.signal_received";
  }
}

export function mapObservabilityWebhook(
  payload: unknown,
  config: ObservabilityConfig,
): MappedObservabilityWebhook | null {
  const raw =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : null;
  if (!raw) return null;

  const sourceRaw = typeof raw.source === "string" ? raw.source : "generic";
  const source = (
    [
      "generic",
      "sentry",
      "datadog",
      "vercel",
      "railway",
      "render",
      "aws",
      "gcp",
      "azure",
      "manual",
      "cli",
      "mcp",
      "system",
    ] as const
  ).includes(sourceRaw as Doc<"observabilitySignals">["source"])
    ? (sourceRaw as Doc<"observabilitySignals">["source"])
    : "generic";

  const normalized = normalizeObservabilityPayload(source, raw);
  const parsedConfig = parseObservabilityConfig(config);
  if (shouldAcceptObservabilitySignal(parsedConfig, normalized) === "blocked") {
    return { blocked: true };
  }

  const display = timelineVisibilityForSignal(normalized);
  const sourceEventId =
    normalized.sourceSignalId ??
    normalized.fingerprint ??
    `${normalized.signalType}:${normalized.occurredAt}`;

  return {
    source: normalized.source,
    sourceEventId,
    category: "observability",
    type: eventTypeForSignal(normalized.signalType),
    actor: { type: "system", name: normalized.source },
    title: normalized.title,
    summary: normalized.summary,
    data: {
      signalType: normalized.signalType,
      severity: normalized.severity,
      service: normalized.service,
      environment: normalized.environment,
      fingerprint: normalized.fingerprint,
      sourceSignalId: normalized.sourceSignalId,
      sourceUrl: normalized.sourceUrl,
      metadata: normalized.metadata,
    },
    occurredAt: normalized.occurredAt,
    visibility: display.visibility,
    importance: display.importance,
    normalized,
  };
}
