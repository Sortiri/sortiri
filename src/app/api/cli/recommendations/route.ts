import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { listRecommendationsViaIngest } from "@/lib/sortiri/recommendationApi";
import { jsonError } from "@/lib/sortiri/ingestApi";

export async function GET(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const url = new URL(req.url);
  const workspaceResult = resolveIngestWorkspaceId(auth, url.searchParams.get("workspaceId") ?? undefined);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  try {
    const recommendations = await listRecommendationsViaIngest(
      auth,
      workspaceResult.workspaceId,
      limit,
    );
    return Response.json({ recommendations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list recommendations";
    return jsonError(message, 500);
  }
}
