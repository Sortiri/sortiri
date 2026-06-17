import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { insertEvent } from "./eventsLib";
import type { IngestDeliveryStatus } from "./ingestDeliveryLib";

export const MAX_INGEST_RETRY_ATTEMPTS = 3;

export type EnvelopeEventPayload = {
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  source: string;
  category: string;
  type: string;
  actor: {
    type: "agent" | "human" | "system" | "customer";
    id?: string;
    name?: string;
    email?: string;
  };
  title: string;
  summary?: string;
  entity?: {
    type?: string;
    id?: string;
    name?: string;
    url?: string;
  };
  artifactIds?: Id<"artifacts">[];
  data?: unknown;
  severity?: "info" | "warning" | "error" | "critical";
  tags?: string[];
  occurredAt?: number;
  importance?: "low" | "normal" | "high" | "critical";
  visibility?: "primary" | "debug" | "hidden";
};

const ENTITY_TYPES = new Set([
  "file",
  "user",
  "customer",
  "feature",
  "project",
  "workspace",
  "pull_request",
  "issue",
  "payment",
  "subscription",
  "other",
]);

export function parseEnvelopeEventPayload(payload: unknown): EnvelopeEventPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid envelope payload");
  }
  const p = payload as Record<string, unknown>;
  if (
    typeof p.source !== "string" ||
    typeof p.category !== "string" ||
    typeof p.type !== "string" ||
    typeof p.title !== "string" ||
    !p.actor ||
    typeof p.actor !== "object"
  ) {
    throw new Error("Envelope payload missing required event fields");
  }
  return payload as EnvelopeEventPayload;
}

export async function writeEventFromEnvelopePayload(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  payload: unknown,
): Promise<Id<"events">> {
  const event = parseEnvelopeEventPayload(payload);
  const entityType = event.entity?.type;
  return insertEvent(ctx, {
    workspaceId,
    projectId: event.projectId,
    workstreamId: event.workstreamId,
    source: event.source as Parameters<typeof insertEvent>[1]["source"],
    category: event.category as Parameters<typeof insertEvent>[1]["category"],
    type: event.type,
    actor: event.actor,
    title: event.title,
    summary: event.summary,
    entity:
      entityType && ENTITY_TYPES.has(entityType)
        ? {
            type: entityType as NonNullable<
              Parameters<typeof insertEvent>[1]["entity"]
            >["type"],
            id: event.entity?.id,
            name: event.entity?.name,
            url: event.entity?.url,
          }
        : undefined,
    artifactIds: event.artifactIds,
    data: event.data,
    severity: event.severity,
    tags: event.tags,
    occurredAt: event.occurredAt,
    importance: event.importance,
    visibility: event.visibility,
  });
}

export async function recordIngestDeliveryTimelineEvent(
  ctx: MutationCtx,
  input: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    type:
      | "ingest.delivery_received"
      | "ingest.delivery_journaled"
      | "ingest.delivery_written"
      | "ingest.delivery_retry_pending"
      | "ingest.delivery_dead_lettered"
      | "ingest.delivery_replayed"
      | "ingest.delivery_duplicate";
    title: string;
    summary?: string;
    source: string;
    deliveryStatus: IngestDeliveryStatus;
  },
): Promise<void> {
  const isHighSignal =
    input.type === "ingest.delivery_dead_lettered" ||
    input.type === "ingest.delivery_retry_pending";

  await insertEvent(ctx, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    source: "system",
    category: "system_event",
    type: input.type,
    actor: { type: "system", name: "Sortiri Reliability" },
    title: input.title,
    summary: input.summary,
    importance: isHighSignal ? "high" : "low",
    visibility: isHighSignal ? "primary" : "debug",
    data: {
      source: input.source,
      deliveryStatus: input.deliveryStatus,
    },
  });
}

export function aggregateDeliveryHealth(
  deliveries: Array<{
    source: string;
    status: IngestDeliveryStatus;
    receivedAt: number;
    updatedAt: number;
  }>,
  deadLetterCountBySource: Record<string, number>,
  sinceMs: number,
): Record<
  string,
  {
    deliveriesLast24h: number;
    retryPending: number;
    deadLetters: number;
    duplicates: number;
    lastSuccessfulAt?: number;
    lastFailedAt?: number;
    health: "healthy" | "degraded" | "error";
  }
> {
  const bySource: Record<
    string,
    {
      deliveriesLast24h: number;
      retryPending: number;
      deadLetters: number;
      duplicates: number;
      lastSuccessfulAt?: number;
      lastFailedAt?: number;
      health: "healthy" | "degraded" | "error";
    }
  > = {};

  for (const d of deliveries) {
    if (!bySource[d.source]) {
      bySource[d.source] = {
        deliveriesLast24h: 0,
        retryPending: 0,
        deadLetters: 0,
        duplicates: 0,
        health: "healthy",
      };
    }
    const row = bySource[d.source];
    if (d.receivedAt >= sinceMs) {
      row.deliveriesLast24h += 1;
    }
    if (d.status === "retry_pending") row.retryPending += 1;
    if (d.status === "duplicate") row.duplicates += 1;
    if (
      d.status === "convex_written" ||
      d.status === "replayed" ||
      d.status === "duplicate"
    ) {
      row.lastSuccessfulAt = Math.max(row.lastSuccessfulAt ?? 0, d.updatedAt);
    }
    if (d.status === "retry_pending" || d.status === "dead_lettered") {
      row.lastFailedAt = Math.max(row.lastFailedAt ?? 0, d.updatedAt);
    }
  }

  for (const [source, count] of Object.entries(deadLetterCountBySource)) {
    if (!bySource[source]) {
      bySource[source] = {
        deliveriesLast24h: 0,
        retryPending: 0,
        deadLetters: 0,
        duplicates: 0,
        health: "error",
      };
    }
    bySource[source].deadLetters = count;
  }

  for (const row of Object.values(bySource)) {
    if (row.deadLetters > 0) {
      row.health = "error";
    } else if (row.retryPending > 0) {
      row.health = "degraded";
    } else {
      row.health = "healthy";
    }
  }

  return bySource;
}
