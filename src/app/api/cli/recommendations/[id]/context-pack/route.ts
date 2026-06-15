import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { generateContextPackFromRecommendationViaIngest } from "@/lib/sortiri/recommendationApi";
import { jsonError, parseJsonBody } from "@/lib/sortiri/ingestApi";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const { id } = await context.params;
  const body = await parseJsonBody<{ workspaceId?: string }>(req);
  const workspaceResult = resolveIngestWorkspaceId(auth, body?.workspaceId);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const result = await generateContextPackFromRecommendationViaIngest(
      auth,
      workspaceResult.workspaceId,
      id as Id<"recommendations">,
    );
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate context pack from recommendation";
    return jsonError(message, 500);
  }
}
