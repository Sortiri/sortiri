import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { getEntityMemoryViaIngest } from "@/lib/sortiri/contextApi";
import { jsonError, parseJsonBody } from "@/lib/sortiri/ingestApi";

export async function POST(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const body = await parseJsonBody<{
    workspaceId?: string;
    entityKeyOrId?: string;
    timeWindowDays?: number;
  }>(req);

  if (!body?.entityKeyOrId?.trim()) {
    return jsonError("entityKeyOrId is required");
  }

  const workspaceResult = resolveIngestWorkspaceId(auth, body.workspaceId);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const result = await getEntityMemoryViaIngest(auth, workspaceResult.workspaceId, {
      entityKeyOrId: body.entityKeyOrId,
      timeWindowDays: body.timeWindowDays,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load entity memory";
    return jsonError(message, 500);
  }
}
