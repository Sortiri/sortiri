import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { generateRecommendationsViaIngest } from "@/lib/sortiri/recommendationApi";
import { jsonError, parseJsonBody } from "@/lib/sortiri/ingestApi";

export async function POST(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const body = await parseJsonBody<{ workspaceId?: string }>(req);
  const workspaceResult = resolveIngestWorkspaceId(auth, body?.workspaceId);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const result = await generateRecommendationsViaIngest(auth, workspaceResult.workspaceId);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate recommendations";
    return jsonError(message, 500);
  }
}
