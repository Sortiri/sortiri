import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { rerunEvalForRemediationViaIngest } from "@/lib/sortiri/evalApi";
import { jsonError, parseJsonBody } from "@/lib/sortiri/ingestApi";

export async function POST(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const body = await parseJsonBody<{
    workspaceId?: string;
    recommendationId?: string;
    workstreamId?: string;
    evalSuiteId?: string;
  }>(req);
  const workspaceResult = resolveIngestWorkspaceId(auth, body?.workspaceId);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  if (!body?.evalSuiteId) {
    return jsonError("evalSuiteId is required", 400);
  }

  try {
    const result = await rerunEvalForRemediationViaIngest(auth, workspaceResult.workspaceId, {
      recommendationId: body.recommendationId,
      workstreamId: body.workstreamId,
      evalSuiteId: body.evalSuiteId,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to rerun eval for remediation";
    return jsonError(message, 500);
  }
}
