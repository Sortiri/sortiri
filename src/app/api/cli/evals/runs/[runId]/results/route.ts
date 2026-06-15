import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { recordEvalCaseResultViaIngest } from "@/lib/sortiri/evalApi";
import { jsonError, parseJsonBody } from "@/lib/sortiri/ingestApi";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

type RouteContext = { params: Promise<{ runId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const { runId } = await context.params;
  const body = await parseJsonBody<{
    workspaceId?: string;
    evalCaseId: string;
    status: string;
    title: string;
    summary?: string;
    output?: string;
    error?: string;
    startedAt?: number;
    completedAt?: number;
  }>(req);

  if (!body?.evalCaseId || !body.status || !body.title) {
    return jsonError("evalCaseId, status, and title are required", 400);
  }

  const workspaceResult = resolveIngestWorkspaceId(auth, body.workspaceId);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const result = await recordEvalCaseResultViaIngest(
      auth,
      workspaceResult.workspaceId,
      runId as Id<"evalRuns">,
      {
        evalCaseId: body.evalCaseId as Id<"evalCases">,
        status: body.status,
        title: body.title,
        summary: body.summary,
        output: body.output,
        error: body.error,
        startedAt: body.startedAt,
        completedAt: body.completedAt,
      },
    );
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record case result";
    return jsonError(message, 500);
  }
}
