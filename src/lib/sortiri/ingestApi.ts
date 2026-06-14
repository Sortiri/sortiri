import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { EventActor, EventCategory, EventSource } from "@/types/events";
import type { Id } from "../../../convex/_generated/dataModel";

let client: ConvexHttpClient | null = null;

export function getIngestConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
  }
  if (!client) {
    client = new ConvexHttpClient(url);
  }
  return client;
}

export function getIngestKey(): string {
  const key = process.env.SORTIRI_DEV_INGEST_KEY;
  if (!key) {
    throw new Error("Missing SORTIRI_DEV_INGEST_KEY");
  }
  return key;
}

export function unauthorizedResponse(message = "Unauthorized") {
  return Response.json({ error: message }, { status: 401 });
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function parseJsonBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export type IngestAuthContext =
  | {
      mode: "apiKey";
      rawKey: string;
      workspaceExternalId: string;
      apiKeyId: Id<"apiKeys">;
    }
  | { mode: "dev"; rawKey: string };

function buildIngestMutationArgs(
  auth: IngestAuthContext,
  workspaceId: string,
): {
  workspaceId: string;
  ingestKey?: string;
  apiKeyId?: Id<"apiKeys">;
} {
  if (auth.mode === "apiKey") {
    return {
      workspaceId,
      apiKeyId: auth.apiKeyId,
    };
  }
  return {
    workspaceId,
    ingestKey: auth.rawKey,
  };
}

async function markApiKeyUsedIfNeeded(auth: IngestAuthContext): Promise<void> {
  if (auth.mode !== "apiKey") {
    return;
  }
  const convex = getIngestConvexClient();
  await convex.mutation(api.apiKeys.markUsed, { apiKeyId: auth.apiKeyId });
}

export type StartWorkstreamBody = {
  workspaceId?: string;
  projectId?: Id<"projects">;
  title: string;
  summary?: string;
  actor?: {
    type: "agent" | "human" | "system";
    id?: string;
    name?: string;
  };
};

export type FinishWorkstreamBody = {
  workspaceId?: string;
  workstreamId: Id<"workstreams">;
  projectId?: Id<"projects">;
  summary?: string;
  outcome?: string;
};

export type RecordEventBody = {
  workspaceId?: string;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  source: EventSource;
  category: EventCategory;
  type: string;
  actor: EventActor;
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
  displayReason?: string;
  isUserPinned?: boolean;
  isUserHidden?: boolean;
};

export type CreateArtifactBody = {
  workspaceId?: string;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  type:
    | "diff"
    | "file"
    | "url"
    | "screenshot"
    | "document"
    | "log"
    | "command_output"
    | "other";
  title: string;
  summary?: string;
  url?: string;
  content?: string;
  metadata?: unknown;
  sizeBytes?: number;
  language?: string;
  filePath?: string;
  truncated?: boolean;
  emitEvent?: boolean;
};

export async function startWorkstreamViaConvex(
  auth: IngestAuthContext,
  body: StartWorkstreamBody,
  workspaceId: string,
) {
  const convex = getIngestConvexClient();
  const result = await convex.mutation(api.ingest.startWorkstream, {
    ...buildIngestMutationArgs(auth, workspaceId),
    projectId: body.projectId,
    title: body.title,
    summary: body.summary,
    actor: body.actor,
  });
  await markApiKeyUsedIfNeeded(auth);
  return result;
}

export async function finishWorkstreamViaConvex(
  auth: IngestAuthContext,
  body: FinishWorkstreamBody,
  workspaceId: string,
) {
  const convex = getIngestConvexClient();
  const result = await convex.mutation(api.ingest.finishWorkstream, {
    ...buildIngestMutationArgs(auth, workspaceId),
    workstreamId: body.workstreamId,
    projectId: body.projectId,
    summary: body.summary,
    outcome: body.outcome,
  });
  await markApiKeyUsedIfNeeded(auth);
  return result;
}

export async function recordEventViaConvex(
  auth: IngestAuthContext,
  body: RecordEventBody,
  workspaceId: string,
) {
  const convex = getIngestConvexClient();
  const result = await convex.mutation(api.ingest.recordEvent, {
    ...buildIngestMutationArgs(auth, workspaceId),
    projectId: body.projectId,
    workstreamId: body.workstreamId,
    source: body.source,
    category: body.category,
    type: body.type,
    actor: body.actor,
    title: body.title,
    summary: body.summary,
    entity: body.entity?.type
      ? {
          type: body.entity.type as
            | "file"
            | "user"
            | "customer"
            | "feature"
            | "project"
            | "workspace"
            | "pull_request"
            | "issue"
            | "payment"
            | "subscription"
            | "other",
          id: body.entity.id,
          name: body.entity.name,
          url: body.entity.url,
        }
      : undefined,
    artifactIds: body.artifactIds,
    data: body.data,
    severity: body.severity,
    tags: body.tags,
    occurredAt: body.occurredAt,
  });
  await markApiKeyUsedIfNeeded(auth);
  return result;
}

export async function createArtifactViaConvex(
  auth: IngestAuthContext,
  body: CreateArtifactBody,
  workspaceId: string,
) {
  const convex = getIngestConvexClient();
  const result = await convex.mutation(api.ingest.createArtifact, {
    ...buildIngestMutationArgs(auth, workspaceId),
    projectId: body.projectId,
    workstreamId: body.workstreamId,
    type: body.type,
    title: body.title,
    summary: body.summary,
    url: body.url,
    content: body.content,
    metadata: body.metadata,
    sizeBytes: body.sizeBytes,
    language: body.language,
    filePath: body.filePath,
    truncated: body.truncated,
    emitEvent: body.emitEvent,
  });
  await markApiKeyUsedIfNeeded(auth);
  return result;
}
