import {
  authenticateIngest,
  isIngestAuthResponse,
} from "@/lib/sortiri/ingestAuth";
import {
  finishWorkstreamViaConvex,
  jsonError,
  parseJsonBody,
  type FinishWorkstreamBody,
} from "@/lib/sortiri/ingestApi";

export async function POST(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const body = await parseJsonBody<FinishWorkstreamBody>(req);
  if (!body?.workstreamId) {
    return jsonError("workstreamId is required");
  }

  const workspaceId =
    auth.mode === "apiKey" ? auth.workspaceExternalId : body.workspaceId;
  if (!workspaceId) {
    return jsonError("workspaceId is required");
  }
  if (auth.mode === "apiKey" && body.workspaceId && body.workspaceId !== workspaceId) {
    return jsonError("Workspace mismatch", 403);
  }

  try {
    const result = await finishWorkstreamViaConvex(auth, body, workspaceId);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to finish workstream";
    return jsonError(message, 500);
  }
}
