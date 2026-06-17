import type { Doc } from "../_generated/dataModel";
import type { EventImportance, EventVisibility } from "./eventDisplay";
import { redactObservabilityPayload } from "./observabilityRedaction";

export type NormalizedObservabilitySignal = {
  source: Doc<"observabilitySignals">["source"];
  signalType: Doc<"observabilitySignals">["signalType"];
  severity: Doc<"observabilitySignals">["severity"];
  title: string;
  summary?: string;
  service?: string;
  environment?: string;
  region?: string;
  fingerprint?: string;
  sourceSignalId?: string;
  sourceUrl?: string;
  occurredAt: number;
  visibility: EventVisibility;
  importance: EventImportance;
  metadata?: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function pickTag(tags: unknown, prefix: string): string | undefined {
  if (!Array.isArray(tags)) return undefined;
  for (const tag of tags) {
    const s = asString(tag);
    if (s?.startsWith(`${prefix}:`)) return s.slice(prefix.length + 1);
  }
  return undefined;
}

function severityFromLevel(
  level: string | undefined,
): Doc<"observabilitySignals">["severity"] {
  const lower = (level ?? "").toLowerCase();
  if (lower === "fatal" || lower === "critical" || lower === "emergency") return "critical";
  if (lower === "error" || lower === "err") return "error";
  if (lower === "warn" || lower === "warning") return "warning";
  return "info";
}

function displayForSeverity(severity: Doc<"observabilitySignals">["severity"]): {
  visibility: EventVisibility;
  importance: EventImportance;
} {
  switch (severity) {
    case "critical":
      return { visibility: "primary", importance: "critical" };
    case "error":
      return { visibility: "primary", importance: "high" };
    case "warning":
      return { visibility: "primary", importance: "normal" };
    default:
      return { visibility: "debug", importance: "low" };
  }
}

export function parseGenericObservabilityJson(payload: unknown): Record<string, unknown> {
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      const record = asRecord(parsed);
      if (!record) throw new Error("Observability payload must be a JSON object");
      return record;
    } catch {
      throw new Error("Observability payload is not valid JSON");
    }
  }
  const record = asRecord(payload);
  if (!record) throw new Error("Observability payload must be a JSON object");
  return record;
}

function sentryExceptionTitle(raw: Record<string, unknown>): string | undefined {
  const exception = asRecord(raw.exception);
  if (!exception || !Array.isArray(exception.values)) return undefined;
  const first = exception.values[0];
  if (typeof first === "object" && first !== null && "value" in first) {
    return asString((first as Record<string, unknown>).value);
  }
  return undefined;
}

function normalizeSentryPayload(raw: Record<string, unknown>): NormalizedObservabilitySignal {
  const level = asString(raw.level) ?? asString(raw.severity);
  const severity = severityFromLevel(level);
  const display = displayForSeverity(severity);
  const eventId = asString(raw.event_id) ?? asString(raw.id);
  const issueId = asString(raw.issue_id) ?? asString(raw.groupID);
  const title =
    asString(raw.title) ??
    asString(raw.message) ??
    sentryExceptionTitle(raw) ??
    "Sentry event";
  const occurredAt = asNumber(raw.timestamp) ?? asNumber(raw.dateCreated) ?? Date.now();
  const fingerprint = Array.isArray(raw.fingerprint)
    ? raw.fingerprint.map(String).join(":")
    : asString(raw.fingerprint);

  return {
    source: "sentry",
    signalType: severity === "info" ? "other" : "error",
    severity,
    title,
    summary: asString(raw.culprit) ?? asString(raw.transaction),
    service: asString(raw.project) ?? asString(raw.project_name),
    environment: asString(raw.environment),
    fingerprint: fingerprint ?? issueId,
    sourceSignalId: eventId ?? issueId,
    sourceUrl: asString(raw.url) ?? asString(raw.web_url),
    occurredAt,
    visibility: display.visibility,
    importance: display.importance,
    metadata: redactObservabilityPayload(raw) as Record<string, unknown>,
  };
}

function normalizeDatadogPayload(raw: Record<string, unknown>): NormalizedObservabilitySignal {
  const alertType = (asString(raw.alert_type) ?? asString(raw.event_type) ?? "").toLowerCase();
  const title =
    asString(raw.title) ??
    asString(raw.alert_title) ??
    asString(raw.msg_title) ??
    asString(raw.body) ??
    "Datadog alert";
  const severity = severityFromLevel(asString(raw.priority) ?? asString(raw.alert_priority));
  const display = displayForSeverity(severity);
  const tags = raw.tags;
  const signalType: Doc<"observabilitySignals">["signalType"] =
    alertType.includes("recovery") || alertType.includes("resolved")
      ? "service_recovered"
      : alertType.includes("warn")
        ? "alert"
        : alertType.includes("error") || alertType.includes("failure")
          ? "error"
          : "alert";

  return {
    source: "datadog",
    signalType,
    severity,
    title,
    summary: asString(raw.text) ?? asString(raw.body),
    service: pickTag(tags, "service") ?? asString(raw.service),
    environment: pickTag(tags, "env") ?? pickTag(tags, "environment"),
    region: pickTag(tags, "region"),
    fingerprint: asString(raw.alert_id) ?? asString(raw.id) ?? asString(raw.monitor_id),
    sourceSignalId: asString(raw.alert_id) ?? asString(raw.id) ?? asString(raw.event_id),
    sourceUrl: asString(raw.link) ?? asString(raw.alert_url),
    occurredAt: asNumber(raw.date) ?? asNumber(raw.timestamp) ?? Date.now(),
    visibility: display.visibility,
    importance: display.importance,
    metadata: redactObservabilityPayload(raw) as Record<string, unknown>,
  };
}

function inferDeploySignalType(
  status: string | undefined,
  failed?: boolean,
): Doc<"observabilitySignals">["signalType"] {
  const lower = (status ?? "").toLowerCase();
  if (lower.includes("rollback")) {
    return lower.includes("complete") || lower.includes("success")
      ? "rollback_completed"
      : "rollback_started";
  }
  if (failed || lower.includes("fail") || lower.includes("error")) return "deploy_failed";
  if (lower.includes("start") || lower.includes("building") || lower.includes("queued")) {
    return "deploy_started";
  }
  if (lower.includes("success") || lower.includes("ready") || lower.includes("complete")) {
    return "deploy_succeeded";
  }
  return "other";
}

function normalizeDeployPayload(
  raw: Record<string, unknown>,
  source: Doc<"observabilitySignals">["source"],
): NormalizedObservabilitySignal {
  const deployment = asRecord(raw.deployment) ?? asRecord(raw.payload);
  const nestedDeployment = deployment ? asRecord(deployment.deployment) : null;
  const project = asRecord(raw.project);
  const status =
    asString(raw.state) ??
    asString(raw.status) ??
    asString(deployment?.status) ??
    asString(nestedDeployment?.status);
  const failed = status?.toLowerCase().includes("fail") ?? false;
  const signalType = inferDeploySignalType(status, failed);
  const severity: Doc<"observabilitySignals">["severity"] =
    signalType === "deploy_failed" ? "error" : "info";
  const display = displayForSeverity(severity);
  const title =
    asString(raw.name) ??
    asString(deployment?.name) ??
    asString(project?.name) ??
    `${source} deploy`;

  return {
    source,
    signalType,
    severity,
    title,
    summary: status ? `Status: ${status}` : undefined,
    service:
      asString(raw.service) ??
      asString(deployment?.name) ??
      asString(project?.name) ??
      asString(raw.app),
    environment:
      asString(raw.environment) ??
      asString(raw.target) ??
      asString(deployment?.environment),
    region: asString(raw.region),
    fingerprint:
      asString(raw.id) ??
      asString(deployment?.id) ??
      asString(raw.deploymentId) ??
      asString(raw.uid),
    sourceSignalId:
      asString(raw.id) ??
      asString(deployment?.id) ??
      asString(raw.deploymentId) ??
      asString(raw.uid),
    sourceUrl: asString(raw.url) ?? asString(deployment?.url),
    occurredAt:
      asNumber(raw.createdAt) ??
      asNumber(raw.created_at) ??
      asNumber(deployment?.createdAt) ??
      Date.now(),
    visibility: signalType === "deploy_failed" ? "primary" : display.visibility,
    importance: signalType === "deploy_failed" ? "high" : display.importance,
    metadata: redactObservabilityPayload(raw) as Record<string, unknown>,
  };
}

function normalizeGenericPayload(raw: Record<string, unknown>): NormalizedObservabilitySignal {
  const severity = severityFromLevel(asString(raw.severity) ?? asString(raw.level));
  const display = displayForSeverity(severity);
  const signalTypeRaw = asString(raw.signalType) ?? asString(raw.type);
  const signalType = (
    [
      "error",
      "alert",
      "incident_opened",
      "incident_updated",
      "incident_resolved",
      "deploy_started",
      "deploy_succeeded",
      "deploy_failed",
      "rollback_started",
      "rollback_completed",
      "service_degraded",
      "service_recovered",
      "latency_spike",
      "traffic_drop",
      "other",
    ] as const
  ).includes(signalTypeRaw as Doc<"observabilitySignals">["signalType"])
    ? (signalTypeRaw as Doc<"observabilitySignals">["signalType"])
    : severity === "error" || severity === "critical"
      ? "error"
      : "other";

  return {
    source: "generic",
    signalType,
    severity,
    title: asString(raw.title) ?? asString(raw.message) ?? "Observability signal",
    summary: asString(raw.summary) ?? asString(raw.description),
    service: asString(raw.service),
    environment: asString(raw.environment),
    region: asString(raw.region),
    fingerprint: asString(raw.fingerprint),
    sourceSignalId: asString(raw.sourceSignalId) ?? asString(raw.id),
    sourceUrl: asString(raw.sourceUrl) ?? asString(raw.url),
    occurredAt: asNumber(raw.occurredAt) ?? asNumber(raw.timestamp) ?? Date.now(),
    visibility: display.visibility,
    importance: display.importance,
    metadata: redactObservabilityPayload(raw) as Record<string, unknown>,
  };
}

export function normalizeObservabilityPayload(
  source: Doc<"observabilitySignals">["source"],
  payload: unknown,
): NormalizedObservabilitySignal {
  const raw = parseGenericObservabilityJson(payload);
  switch (source) {
    case "sentry":
      return normalizeSentryPayload(raw);
    case "datadog":
      return normalizeDatadogPayload(raw);
    case "vercel":
    case "railway":
    case "render":
    case "aws":
    case "gcp":
    case "azure":
      return normalizeDeployPayload(raw, source);
    default:
      return { ...normalizeGenericPayload(raw), source };
  }
}
