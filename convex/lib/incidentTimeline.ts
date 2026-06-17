import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { insertEvent } from "./eventsLib";
import { EVENT_CATEGORIES } from "./eventTypes";
import type { EventImportance, EventVisibility } from "./eventDisplay";

type DbCtx = Pick<MutationCtx, "db">;

function severityToImportance(
  severity: Doc<"incidents">["severity"],
): EventImportance {
  switch (severity) {
    case "critical":
      return "critical";
    case "error":
      return "high";
    case "warning":
      return "normal";
    default:
      return "low";
  }
}

export async function recordIncidentTimelineEvent(
  ctx: DbCtx,
  input: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    incidentId: Id<"incidents">;
    title: string;
    summary?: string;
    source: Doc<"incidents">["source"];
    severity: Doc<"incidents">["severity"];
    status?: Doc<"incidents">["status"];
    service?: string;
    tags?: string[];
    occurredAt?: number;
    visibility?: EventVisibility;
    importance?: EventImportance;
  },
): Promise<Id<"events">> {
  const eventId = await insertEvent(ctx, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    source:
      input.source === "cli"
        ? "cli"
        : input.source === "sentry" || input.source === "datadog"
          ? "other"
          : "manual",
    category: EVENT_CATEGORIES.OBSERVABILITY,
    type: "incident.recorded",
    actor: { type: "system", name: input.source },
    title: input.title,
    summary: input.summary,
    entity: { type: "other", id: input.incidentId, name: input.title },
    data: {
      incidentId: input.incidentId,
      status: input.status,
      service: input.service,
    },
    severity: input.severity,
    tags: input.tags ?? ["incident", "observability"],
    visibility: input.visibility ?? "primary",
    importance: input.importance ?? severityToImportance(input.severity),
    occurredAt: input.occurredAt ?? Date.now(),
  });
  return eventId;
}

export async function recordDeployTimelineEvent(
  ctx: DbCtx,
  input: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    signalId?: Id<"observabilitySignals">;
    incidentId?: Id<"incidents">;
    title: string;
    summary?: string;
    source: Doc<"observabilitySignals">["source"];
    signalType: Extract<
      Doc<"observabilitySignals">["signalType"],
      "deploy_started" | "deploy_succeeded" | "deploy_failed"
    >;
    severity?: Doc<"observabilitySignals">["severity"];
    service?: string;
    occurredAt?: number;
    visibility?: EventVisibility;
    importance?: EventImportance;
  },
): Promise<Id<"events">> {
  return insertEvent(ctx, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    source: input.source === "cli" ? "cli" : "other",
    category: EVENT_CATEGORIES.OBSERVABILITY,
    type: `deploy.${input.signalType.replace("deploy_", "")}`,
    actor: { type: "system", name: input.source },
    title: input.title,
    summary: input.summary,
    entity: {
      type: "other",
      id: input.signalId ?? input.incidentId ?? input.title,
      name: input.title,
    },
    data: {
      signalId: input.signalId,
      incidentId: input.incidentId,
      service: input.service,
      signalType: input.signalType,
    },
    severity: input.severity ?? (input.signalType === "deploy_failed" ? "error" : "info"),
    tags: ["deploy", "observability"],
    visibility: input.visibility ?? (input.signalType === "deploy_failed" ? "primary" : "debug"),
    importance:
      input.importance ?? (input.signalType === "deploy_failed" ? "high" : "normal"),
    occurredAt: input.occurredAt ?? Date.now(),
  });
}

export async function recordRollbackObservabilityEvent(
  ctx: DbCtx,
  input: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    signalId?: Id<"observabilitySignals">;
    incidentId?: Id<"incidents">;
    rollbackId?: Id<"rollbackEvents">;
    title: string;
    summary?: string;
    source: Doc<"observabilitySignals">["source"];
    signalType: Extract<
      Doc<"observabilitySignals">["signalType"],
      "rollback_started" | "rollback_completed"
    >;
    severity?: Doc<"observabilitySignals">["severity"];
    occurredAt?: number;
  },
): Promise<Id<"events">> {
  return insertEvent(ctx, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    source: input.source === "cli" ? "cli" : "other",
    category: EVENT_CATEGORIES.OBSERVABILITY,
    type: `rollback.${input.signalType.replace("rollback_", "")}`,
    actor: { type: "system", name: input.source },
    title: input.title,
    summary: input.summary,
    entity: {
      type: "other",
      id: input.rollbackId ?? input.signalId ?? input.incidentId ?? input.title,
      name: input.title,
    },
    data: {
      signalId: input.signalId,
      incidentId: input.incidentId,
      rollbackId: input.rollbackId,
      signalType: input.signalType,
    },
    severity: input.severity ?? "warning",
    tags: ["rollback", "observability"],
    visibility: "primary",
    importance: "high",
    occurredAt: input.occurredAt ?? Date.now(),
  });
}

export async function recordServiceHealthTimelineEvent(
  ctx: DbCtx,
  input: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    signalId?: Id<"observabilitySignals">;
    incidentId?: Id<"incidents">;
    title: string;
    summary?: string;
    source: Doc<"observabilitySignals">["source"];
    signalType: Extract<
      Doc<"observabilitySignals">["signalType"],
      "service_degraded" | "service_recovered" | "latency_spike" | "traffic_drop"
    >;
    severity: Doc<"observabilitySignals">["severity"];
    service?: string;
    occurredAt?: number;
    visibility?: EventVisibility;
    importance?: EventImportance;
  },
): Promise<Id<"events">> {
  return insertEvent(ctx, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    source: input.source === "datadog" || input.source === "sentry" ? "other" : "system",
    category: EVENT_CATEGORIES.OBSERVABILITY,
    type: `service.${input.signalType}`,
    actor: { type: "system", name: input.source },
    title: input.title,
    summary: input.summary,
    entity: {
      type: "other",
      id: input.signalId ?? input.incidentId ?? input.title,
      name: input.title,
    },
    data: {
      signalId: input.signalId,
      incidentId: input.incidentId,
      service: input.service,
      signalType: input.signalType,
    },
    severity: input.severity,
    tags: ["service", "observability"],
    visibility: input.visibility ?? "primary",
    importance: input.importance ?? severityToImportance(input.severity),
    occurredAt: input.occurredAt ?? Date.now(),
  });
}
