import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { getRecommendationViaIngest } from "@/lib/sortiri/recommendationApi";
import { jsonError } from "@/lib/sortiri/ingestApi";
import type { Id } from "../../../../../../convex/_generated/dataModel";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const { id } = await context.params;
  const url = new URL(req.url);
  const workspaceResult = resolveIngestWorkspaceId(auth, url.searchParams.get("workspaceId") ?? undefined);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const recommendation = await getRecommendationViaIngest(
      auth,
      workspaceResult.workspaceId,
      id as Id<"recommendations">,
    );
    return Response.json({ recommendation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load recommendation";
    return jsonError(message, 500);
  }
}
