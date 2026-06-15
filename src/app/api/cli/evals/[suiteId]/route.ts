import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { getEvalSuiteViaIngest } from "@/lib/sortiri/evalApi";
import { jsonError } from "@/lib/sortiri/ingestApi";
import type { Id } from "../../../../../../convex/_generated/dataModel";

type RouteContext = { params: Promise<{ suiteId: string }> };

export async function GET(req: Request, context: RouteContext) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const { suiteId } = await context.params;
  const url = new URL(req.url);
  const workspaceResult = resolveIngestWorkspaceId(auth, url.searchParams.get("workspaceId") ?? undefined);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const result = await getEvalSuiteViaIngest(
      auth,
      workspaceResult.workspaceId,
      suiteId as Id<"evalSuites">,
    );
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load eval suite";
    return jsonError(message, 500);
  }
}
