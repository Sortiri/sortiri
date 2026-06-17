import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getJournal } from "@/lib/reliability/journalFactory";
import { getIngestConvexClient } from "./ingestApi";
import {
  buildReliabilityArgs,
  type ReliabilityAuthContext,
} from "./reliabilityAuth";

export type { ReliabilityAuthContext };

function args(auth: ReliabilityAuthContext, workspaceId: string) {
  return buildReliabilityArgs(auth, workspaceId);
}

export async function checkIdempotencyViaConvex(
  auth: ReliabilityAuthContext,
  workspaceId: string,
  idempotencyKey: string,
) {
  const convex = getIngestConvexClient();
  return convex.query(api.reliabilityIngest.checkIdempotency, {
    ...args(auth, workspaceId),
    idempotencyKey,
  });
}

export async function registerJournaledDeliveryViaConvex(
  auth: ReliabilityAuthContext,
  workspaceId: string,
  input: {
    envelopeId: string;
    idempotencyKey: string;
    source: string;
    sourceEventId: string;
    projectId?: Id<"projects">;
    journalRef: string;
    redacted?: boolean;
    sensitiveFindings?: string[];
    receivedAt: number;
  },
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.reliabilityIngest.registerJournaledDelivery, {
    ...args(auth, workspaceId),
    ...input,
  });
}

export async function completeDeliveryWriteViaConvex(
  auth: ReliabilityAuthContext,
  workspaceId: string,
  deliveryId: Id<"ingestDeliveries">,
  payload: unknown,
  options?: {
    replayed?: boolean;
    integrationSource?: string;
    integrationDeliveryId?: string;
    integrationEventType?: string;
  },
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.reliabilityIngest.completeDeliveryWrite, {
    ...args(auth, workspaceId),
    deliveryId,
    payload,
    replayed: options?.replayed,
    integrationSource: options?.integrationSource,
    integrationDeliveryId: options?.integrationDeliveryId,
    integrationEventType: options?.integrationEventType,
  });
}

export async function markDeliveryRetryPendingViaConvex(
  auth: ReliabilityAuthContext,
  workspaceId: string,
  deliveryId: Id<"ingestDeliveries">,
  error: string,
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.reliabilityIngest.markDeliveryRetryPending, {
    ...args(auth, workspaceId),
    deliveryId,
    error,
  });
}

export async function createDeadLetterDirectViaConvex(
  auth: ReliabilityAuthContext,
  workspaceId: string,
  input: {
    envelopeId: string;
    idempotencyKey: string;
    source: string;
    sourceEventId: string;
    projectId?: Id<"projects">;
    journalRef?: string;
    deliveryId?: Id<"ingestDeliveries">;
    reason: string;
    error?: string;
    payloadPreview?: string;
    sensitiveFindings?: string[];
    redacted?: boolean;
    attempts: number;
  },
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.reliabilityIngest.createDeadLetterDirect, {
    ...args(auth, workspaceId),
    ...input,
  });
}

export async function listDeliveriesViaIngest(
  auth: ReliabilityAuthContext,
  workspaceId: string,
  options?: { status?: string; source?: string; limit?: number },
) {
  const convex = getIngestConvexClient();
  return convex.query(api.reliabilityIngest.listDeliveriesForIngest, {
    ...args(auth, workspaceId),
    status: options?.status as
      | "received"
      | "journaled"
      | "convex_written"
      | "retry_pending"
      | "dead_lettered"
      | "replayed"
      | "duplicate"
      | undefined,
    source: options?.source,
    limit: options?.limit,
  });
}

export async function listDeadLettersViaIngest(
  auth: ReliabilityAuthContext,
  workspaceId: string,
  options?: { status?: string; limit?: number },
) {
  const convex = getIngestConvexClient();
  return convex.query(api.reliabilityIngest.listDeadLettersForIngest, {
    ...args(auth, workspaceId),
    status: options?.status as
      | "open"
      | "replayed"
      | "ignored"
      | "archived"
      | undefined,
    limit: options?.limit,
  });
}

export async function getDeliveryViaIngest(
  auth: ReliabilityAuthContext,
  workspaceId: string,
  deliveryId: string,
) {
  const convex = getIngestConvexClient();
  return convex.query(api.reliabilityIngest.getDeliveryForIngest, {
    ...args(auth, workspaceId),
    deliveryId: deliveryId as Id<"ingestDeliveries">,
  });
}

export async function getDeliveryHealthSummaryViaIngest(
  auth: ReliabilityAuthContext,
  workspaceId: string,
) {
  const convex = getIngestConvexClient();
  return convex.query(api.reliabilityIngest.getDeliveryHealthForIngest, {
    ...args(auth, workspaceId),
  });
}

export async function replayDeliveryViaIngest(
  auth: ReliabilityAuthContext,
  workspaceId: string,
  deliveryId: string,
  payload: unknown,
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.reliabilityIngest.replayDeliveryForIngest, {
    ...args(auth, workspaceId),
    deliveryId: deliveryId as Id<"ingestDeliveries">,
    payload,
  });
}

export async function getDeadLetterViaIngest(
  auth: ReliabilityAuthContext,
  workspaceId: string,
  deadLetterId: string,
) {
  const convex = getIngestConvexClient();
  return convex.query(api.reliabilityIngest.getDeadLetterForIngest, {
    ...args(auth, workspaceId),
    deadLetterId: deadLetterId as Id<"ingestDeadLetters">,
  });
}

export async function listJournalEntriesViaIngest(
  workspaceId: string,
  options?: { source?: string; limit?: number },
) {
  const journal = getJournal();
  return journal.list({
    workspaceId,
    source: options?.source,
    limit: options?.limit,
  });
}
