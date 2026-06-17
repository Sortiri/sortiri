import type { Id } from "../../../convex/_generated/dataModel";
import { markApiKeyUsedIfNeeded } from "@/lib/sortiri/ingestPipelineHelpers";
import type { ReliabilityAuthContext } from "@/lib/sortiri/reliabilityAuth";
import {
  buildEnvelope,
  buildIdempotencyKey,
  normalizeIngestPayload,
  truncatePayloadPreview,
  type IngestEventEnvelope,
} from "./eventEnvelope";
import { getJournal } from "./journalFactory";
import {
  checkIdempotencyViaConvex,
  completeDeliveryWriteViaConvex,
  createDeadLetterDirectViaConvex,
  markDeliveryRetryPendingViaConvex,
  registerJournaledDeliveryViaConvex,
} from "@/lib/sortiri/reliabilityApi";
import type { RecordEventBody } from "@/lib/sortiri/ingestApi";

export type IngestPipelineResult = {
  ok: true;
  duplicate: boolean;
  eventId?: Id<"events">;
  deliveryId: Id<"ingestDeliveries">;
  status: string;
  journalRef?: string;
};

export type FailureInjection = {
  failJournalWrite?: boolean;
  failConvexWrite?: boolean;
  forceDeadLetter?: boolean;
};

export function readFailureInjection(req: Request): FailureInjection {
  if (process.env.NODE_ENV === "production") {
    return {};
  }
  if (process.env.SORTIRI_ENABLE_FAILURE_INJECTION !== "true") {
    return {};
  }
  return {
    failJournalWrite: req.headers.get("x-sortiri-test-fail-journal-write") === "true",
    failConvexWrite: req.headers.get("x-sortiri-test-fail-convex-write") === "true",
    forceDeadLetter: req.headers.get("x-sortiri-test-force-dead-letter") === "true",
  };
}

export type RunIngestPipelineInput = {
  auth: ReliabilityAuthContext;
  workspaceId: string;
  body: RecordEventBody & { sourceEventId?: string };
  req: Request;
  route?: string;
  integration?: {
    source: string;
    deliveryId: string;
    eventType?: string;
  };
};

export async function runIngestPipeline(
  input: RunIngestPipelineInput,
): Promise<IngestPipelineResult> {
  const normalized = normalizeIngestPayload(input.workspaceId, input.body);
  const idempotencyKey = buildIdempotencyKey(
    input.workspaceId,
    normalized.source,
    normalized.sourceEventId,
  );

  const injection = readFailureInjection(input.req);

  const dupCheck = await checkIdempotencyViaConvex(
    input.auth,
    input.workspaceId,
    idempotencyKey,
  );
  if (dupCheck.duplicate) {
    return {
      ok: true,
      duplicate: true,
      eventId: dupCheck.eventId,
      deliveryId: dupCheck.deliveryId,
      status: dupCheck.status ?? "duplicate",
      journalRef: undefined,
    };
  }

  if (injection.forceDeadLetter) {
    const envelope = buildEnvelope({
      workspaceId: input.workspaceId,
      projectId: normalized.projectId,
      source: normalized.source,
      sourceEventId: normalized.sourceEventId,
      payload: normalized,
      metadata: {
        route: input.route,
        apiKeyId:
          input.auth.mode === "apiKey" ? input.auth.apiKeyId : undefined,
      },
    });
    await createDeadLetterDirectViaConvex(input.auth, input.workspaceId, {
      envelopeId: envelope.envelopeId,
      idempotencyKey,
      source: normalized.source,
      sourceEventId: normalized.sourceEventId,
      projectId: normalized.projectId,
      reason: "forced_dead_letter",
      error: "Test forced dead letter",
      payloadPreview: truncatePayloadPreview(envelope.payload),
      sensitiveFindings: envelope.redaction.findings,
      redacted: envelope.redaction.redacted,
      attempts: 1,
    });
    throw new Error("Forced dead letter");
  }

  const envelope = buildEnvelope({
    workspaceId: input.workspaceId,
    projectId: normalized.projectId,
    source: normalized.source,
    sourceEventId: normalized.sourceEventId,
    payload: normalized,
    metadata: {
      route: input.route,
      apiKeyId: input.auth.mode === "apiKey" ? input.auth.apiKeyId : undefined,
    },
  });

  if (injection.failJournalWrite) {
    throw new Error("Simulated journal write failure");
  }

  const journal = getJournal();
  const journalResult = await journal.write({
    ...envelope,
    status: "journaled",
  });
  const journalRef = journalResult.journalRef;

  const registered = await registerJournaledDeliveryViaConvex(
    input.auth,
    input.workspaceId,
    {
      envelopeId: envelope.envelopeId,
      idempotencyKey,
      source: normalized.source,
      sourceEventId: normalized.sourceEventId,
      projectId: normalized.projectId,
      journalRef,
      redacted: envelope.redaction.redacted,
      sensitiveFindings: envelope.redaction.findings,
      receivedAt: envelope.receivedAt,
    },
  );

  if (registered.duplicate) {
    return {
      ok: true,
      duplicate: true,
      eventId: registered.eventId,
      deliveryId: registered.deliveryId,
      status: registered.status ?? "duplicate",
      journalRef,
    };
  }

  if (injection.failConvexWrite) {
    const retry = await markDeliveryRetryPendingViaConvex(
      input.auth,
      input.workspaceId,
      registered.deliveryId,
      "Simulated Convex write failure",
    );
    await markApiKeyUsedIfNeeded(input.auth);
    return {
      ok: true,
      duplicate: false,
      deliveryId: registered.deliveryId,
      status: retry.status,
      journalRef,
    };
  }

  try {
    const written = await completeDeliveryWriteViaConvex(
      input.auth,
      input.workspaceId,
      registered.deliveryId,
      envelope.payload,
      {
        integrationSource: input.integration?.source,
        integrationDeliveryId: input.integration?.deliveryId,
        integrationEventType: input.integration?.eventType,
      },
    );
    await markApiKeyUsedIfNeeded(input.auth);
    return {
      ok: true,
      duplicate: written.duplicate,
      eventId: written.eventId,
      deliveryId: registered.deliveryId,
      status: written.status,
      journalRef,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Convex write failed";
    const retry = await markDeliveryRetryPendingViaConvex(
      input.auth,
      input.workspaceId,
      registered.deliveryId,
      message,
    );
    await markApiKeyUsedIfNeeded(input.auth);
    return {
      ok: true,
      duplicate: false,
      deliveryId: registered.deliveryId,
      status: retry.status,
      journalRef,
    };
  }
}

export type RunWebhookIngestPipelineInput = {
  auth: ReliabilityAuthContext;
  workspaceId: string;
  source: string;
  sourceEventId: string;
  payload: RecordEventBody & { sourceEventId?: string };
  req: Request;
  route?: string;
  integration?: {
    source: string;
    deliveryId: string;
    eventType?: string;
  };
};

export async function runWebhookIngestPipeline(
  input: RunWebhookIngestPipelineInput,
): Promise<IngestPipelineResult> {
  return runIngestPipeline({
    auth: input.auth,
    workspaceId: input.workspaceId,
    body: { ...input.payload, sourceEventId: input.sourceEventId },
    req: input.req,
    route: input.route,
    integration: input.integration,
  });
}

export async function replayEnvelopeFromJournal(input: {
  auth: ReliabilityAuthContext;
  workspaceId: string;
  deliveryId: Id<"ingestDeliveries">;
  journalRef: string;
  replayed?: boolean;
}): Promise<IngestPipelineResult> {
  const journal = getJournal();
  const envelope = await journal.read(input.journalRef);
  const written = await completeDeliveryWriteViaConvex(
    input.auth,
    input.workspaceId,
    input.deliveryId,
    envelope.payload,
    { replayed: input.replayed ?? true },
  );
  return {
    ok: true,
    duplicate: written.duplicate,
    eventId: written.eventId,
    deliveryId: input.deliveryId,
    status: written.status,
    journalRef: input.journalRef,
  };
}

export type { IngestEventEnvelope };
