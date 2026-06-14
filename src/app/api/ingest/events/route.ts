import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import {
  jsonError,
  parseJsonBody,
  recordEventViaConvex,
  type RecordEventBody,
} from "@/lib/sortiri/ingestApi";

export async function POST(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const body = await parseJsonBody<RecordEventBody>(req);
  if (!body?.source || !body.category || !body.type || !body.actor || !body.title) {
    return jsonError("source, category, type, actor, and title are required");
  }

  const workspaceResult = resolveIngestWorkspaceId(auth, body.workspaceId);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }
  const workspaceId = workspaceResult.workspaceId;

  try {
    const result = await recordEventViaConvex(auth, body, workspaceId);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record event";
    return jsonError(message, 500);
  }
}
