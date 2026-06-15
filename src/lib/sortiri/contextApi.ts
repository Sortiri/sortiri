import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  getIngestConvexClient,
  type IngestAuthContext,
} from "./ingestApi";

function buildIngestArgs(auth: IngestAuthContext, workspaceId: string) {
  if (auth.mode === "apiKey") {
    return { workspaceId, apiKeyId: auth.apiKeyId };
  }
  return { workspaceId, ingestKey: auth.rawKey };
}

export async function createContextPackViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  body: {
    goal: string;
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    entityId?: Id<"entities">;
    files?: string[];
    timeWindowDays?: number;
    title?: string;
  },
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.contextIngest.createAndGenerate, {
    ...buildIngestArgs(auth, workspaceId),
    goal: body.goal,
    projectId: body.projectId,
    workstreamId: body.workstreamId,
    entityId: body.entityId,
    title: body.title,
    request: {
      files: body.files,
      timeWindowMs: body.timeWindowDays
        ? body.timeWindowDays * 24 * 60 * 60 * 1000
        : undefined,
    },
  });
}

export async function getContextPackViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  contextPackId: Id<"contextPacks">,
) {
  const convex = getIngestConvexClient();
  await convex.mutation(api.contextIngest.markUsedByAgent, {
    ...buildIngestArgs(auth, workspaceId),
    contextPackId,
  });
  return convex.query(api.contextIngest.getFormatted, {
    ...buildIngestArgs(auth, workspaceId),
    contextPackId,
  });
}

export async function getProjectMemoryViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  body: { projectId?: Id<"projects">; query?: string; timeWindowDays?: number },
) {
  const convex = getIngestConvexClient();
  return convex.query(api.contextIngest.getProjectMemory, {
    ...buildIngestArgs(auth, workspaceId),
    projectId: body.projectId,
    query: body.query,
    timeWindowMs: body.timeWindowDays
      ? body.timeWindowDays * 24 * 60 * 60 * 1000
      : undefined,
  });
}

export async function getEntityMemoryViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  body: { entityKeyOrId: string; timeWindowDays?: number },
) {
  const convex = getIngestConvexClient();
  return convex.query(api.contextIngest.getEntityMemory, {
    ...buildIngestArgs(auth, workspaceId),
    entityKeyOrId: body.entityKeyOrId,
    timeWindowMs: body.timeWindowDays
      ? body.timeWindowDays * 24 * 60 * 60 * 1000
      : undefined,
  });
}

export async function getKnownFailuresViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  body: {
    goal?: string;
    files?: string[];
    projectId?: Id<"projects">;
  },
) {
  const convex = getIngestConvexClient();
  return convex.query(api.contextIngest.getKnownFailures, {
    ...buildIngestArgs(auth, workspaceId),
    goal: body.goal,
    files: body.files,
    projectId: body.projectId,
  });
}

export async function getValidationRequirementsViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  body: { goal: string; files?: string[]; sources?: string[] },
) {
  const convex = getIngestConvexClient();
  return convex.query(api.contextIngest.getValidationRequirements, {
    ...buildIngestArgs(auth, workspaceId),
    goal: body.goal,
    files: body.files,
    sources: body.sources,
  });
}

export async function getRecommendedPlaybookViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  body: { goal: string; projectId?: Id<"projects"> },
) {
  const convex = getIngestConvexClient();
  return convex.query(api.contextIngest.getRecommendedPlaybook, {
    ...buildIngestArgs(auth, workspaceId),
    goal: body.goal,
    projectId: body.projectId,
  });
}

export type { IngestAuthContext };
