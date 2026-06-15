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
import { redactSensitiveContent } from "@sortiri/security";

function redactArtifactBody(body: CreateArtifactBody): CreateArtifactBody {
  const next = { ...body };
  if (typeof next.content === "string") {
    next.content = redactSensitiveContent(next.content).redacted;
  }
  if (next.metadata !== undefined) {
    try {
      const serialized = JSON.stringify(next.metadata);
      const { redacted } = redactSensitiveContent(serialized);
      next.metadata = JSON.parse(redacted) as unknown;
    } catch {
      // Keep metadata as-is when not JSON-serializable.
    }
  }
  return next;
}

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
    const result = await createArtifactViaConvex(auth, redactArtifactBody(body), workspaceId);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create artifact";
    return jsonError(message, 500);
  }
}
