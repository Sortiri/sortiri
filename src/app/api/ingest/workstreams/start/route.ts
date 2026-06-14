import {
  authenticateIngest,
  isIngestAuthResponse,
} from "@/lib/sortiri/ingestAuth";
import {
  jsonError,
  parseJsonBody,
  startWorkstreamViaConvex,
  type StartWorkstreamBody,
} from "@/lib/sortiri/ingestApi";

export async function POST(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const body = await parseJsonBody<StartWorkstreamBody>(req);
  if (!body?.title) {
    return jsonError("title is required");
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
    const result = await startWorkstreamViaConvex(auth, body, workspaceId);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start workstream";
    return jsonError(message, 500);
  }
}
