import { api } from "../../../convex/_generated/api";
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

export async function listRecommendationsViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  limit?: number,
) {
  const convex = getIngestConvexClient();
  return convex.query(api.recommendationIngest.listOpen, {
    ...buildIngestArgs(auth, workspaceId),
    limit,
  });
}

export async function generateRecommendationsViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.recommendationIngest.generateForWorkspace, {
    ...buildIngestArgs(auth, workspaceId),
  });
}

export async function getRecommendationViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  recommendationId: string,
) {
  const convex = getIngestConvexClient();
  return convex.query(api.recommendationIngest.getById, {
    ...buildIngestArgs(auth, workspaceId),
    recommendationId: recommendationId as import("../../../convex/_generated/dataModel").Id<"recommendations">,
  });
}

export async function generateContextPackFromRecommendationViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  recommendationId: string,
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.recommendationIngest.generateContextPack, {
    ...buildIngestArgs(auth, workspaceId),
    recommendationId: recommendationId as import("../../../convex/_generated/dataModel").Id<"recommendations">,
  });
}

export async function convertRecommendationToWorkstreamViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  recommendationId: string,
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.recommendationIngest.convertToWorkstream, {
    ...buildIngestArgs(auth, workspaceId),
    recommendationId: recommendationId as import("../../../convex/_generated/dataModel").Id<"recommendations">,
  });
}

export type { IngestAuthContext };
