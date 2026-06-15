import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { getEvalRemediationViaIngest } from "@/lib/sortiri/evalApi";
import { jsonError } from "@/lib/sortiri/ingestApi";

type RouteContext = { params: Promise<{ recommendationId: string }> };

export async function GET(req: Request, context: RouteContext) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const { recommendationId } = await context.params;
  const url = new URL(req.url);
  const workspaceResult = resolveIngestWorkspaceId(auth, url.searchParams.get("workspaceId") ?? undefined);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const remediation = await getEvalRemediationViaIngest(
      auth,
      workspaceResult.workspaceId,
      recommendationId,
    );
    return Response.json(remediation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get remediation";
    return jsonError(message, 500);
  }
}
