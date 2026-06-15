import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { generateRemediationFromEvalViaIngest } from "@/lib/sortiri/evalApi";
import { jsonError, parseJsonBody } from "@/lib/sortiri/ingestApi";

export async function POST(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const body = await parseJsonBody<{ workspaceId?: string; evalRunId?: string }>(req);
  const workspaceResult = resolveIngestWorkspaceId(auth, body?.workspaceId);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  if (!body?.evalRunId) {
    return jsonError("evalRunId is required", 400);
  }

  try {
    const result = await generateRemediationFromEvalViaIngest(
      auth,
      workspaceResult.workspaceId,
      body.evalRunId,
    );
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate remediation";
    return jsonError(message, 500);
  }
}
