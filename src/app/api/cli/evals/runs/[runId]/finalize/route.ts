import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { finalizeEvalRunViaIngest } from "@/lib/sortiri/evalApi";
import { jsonError, parseJsonBody } from "@/lib/sortiri/ingestApi";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

type RouteContext = { params: Promise<{ runId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const { runId } = await context.params;
  const body = await parseJsonBody<{ workspaceId?: string }>(req);
  const workspaceResult = resolveIngestWorkspaceId(auth, body?.workspaceId);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const result = await finalizeEvalRunViaIngest(
      auth,
      workspaceResult.workspaceId,
      runId as Id<"evalRuns">,
    );
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to finalize eval run";
    return jsonError(message, 500);
  }
}
