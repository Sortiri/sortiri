import { randomUUID } from "node:crypto";
import { redactSensitiveContent, scanSensitiveContent } from "@sortiri/security";
import type { RecordEventBody } from "@/lib/sortiri/ingestApi";

export type IngestDeliveryStatus =
  | "received"
  | "journaled"
  | "convex_written"
  | "retry_pending"
  | "dead_lettered"
  | "replayed"
  | "duplicate";

export type IngestEventEnvelope = {
  envelopeId: string;
  workspaceId: string;
  projectId?: string;

  source: string;
  sourceEventId: string;
  idempotencyKey: string;

  receivedAt: number;

  status: IngestDeliveryStatus;

  payload: unknown;

  redaction: {
    scanned: boolean;
    redacted: boolean;
    findings: string[];
  };

  delivery: {
    attempts: number;
    lastAttemptAt?: number;
    lastError?: string;
  };

  metadata?: {
    route?: string;
    userAgent?: string;
    apiKeyId?: string;
    sourceDeliveryId?: string;
  };
};

export function buildEnvelopeId(): string {
  return randomUUID();
}

export function buildIdempotencyKey(
  workspaceId: string,
  source: string,
  sourceEventId: string,
): string {
  return `${workspaceId}:${source}:${sourceEventId}`;
}

export function resolveSourceEventId(
  source: string,
  explicitId?: string,
): string {
  if (explicitId?.trim()) {
    return explicitId.trim();
  }
  return `${source}:${randomUUID()}`;
}

export type NormalizedIngestEvent = RecordEventBody & {
  sourceEventId: string;
};

export function normalizeIngestPayload(
  workspaceId: string,
  body: RecordEventBody & { sourceEventId?: string },
): NormalizedIngestEvent {
  const sourceEventId = resolveSourceEventId(body.source, body.sourceEventId);
  return {
    ...body,
    workspaceId: body.workspaceId ?? workspaceId,
    sourceEventId,
  };
}

export function redactEnvelopePayload(payload: unknown): {
  redactedPayload: unknown;
  redaction: IngestEventEnvelope["redaction"];
} {
  const serialized = JSON.stringify(payload ?? {});
  const scan = scanSensitiveContent(serialized);
  const findings = scan.findings.map((f) => `${f.label} (${f.count})`);

  if (!scan.hasSensitiveContent) {
    return {
      redactedPayload: payload,
      redaction: { scanned: true, redacted: false, findings: [] },
    };
  }

  const { redacted } = redactSensitiveContent(serialized);
  let redactedPayload: unknown;
  try {
    redactedPayload = JSON.parse(redacted) as unknown;
  } catch {
    redactedPayload = { redacted: true, preview: redacted.slice(0, 500) };
  }

  return {
    redactedPayload,
    redaction: { scanned: true, redacted: true, findings },
  };
}

export function buildEnvelope(input: {
  workspaceId: string;
  projectId?: string;
  source: string;
  sourceEventId: string;
  payload: unknown;
  metadata?: IngestEventEnvelope["metadata"];
  status?: IngestDeliveryStatus;
}): IngestEventEnvelope {
  const { redactedPayload, redaction } = redactEnvelopePayload(input.payload);
  const receivedAt = Date.now();

  return {
    envelopeId: buildEnvelopeId(),
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    source: input.source,
    sourceEventId: input.sourceEventId,
    idempotencyKey: buildIdempotencyKey(
      input.workspaceId,
      input.source,
      input.sourceEventId,
    ),
    receivedAt,
    status: input.status ?? "received",
    payload: redactedPayload,
    redaction,
    delivery: { attempts: 0 },
    metadata: input.metadata,
  };
}

export function truncatePayloadPreview(payload: unknown, maxLen = 280): string {
  const text =
    typeof payload === "string" ? payload : JSON.stringify(payload ?? {});
  const safe = text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  return redactSensitiveContent(safe).redacted;
}
