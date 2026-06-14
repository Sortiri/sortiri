import {
  authenticateIngest,
  isIngestAuthResponse,
} from "@/lib/sortiri/ingestAuth";
import {
  createArtifactViaConvex,
  jsonError,
  parseJsonBody,
  type CreateArtifactBody,
} from "@/lib/sortiri/ingestApi";

export async function POST(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const body = await parseJsonBody<CreateArtifactBody>(req);
  if (!body?.type || !body.title) {
    return jsonError("type and title are required");
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
    const result = await createArtifactViaConvex(auth, body, workspaceId);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create artifact";
    return jsonError(message, 500);
  }
}
