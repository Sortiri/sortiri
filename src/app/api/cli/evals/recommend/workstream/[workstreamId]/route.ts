import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { recommendEvalsForWorkstreamViaIngest } from "@/lib/sortiri/evalApi";
import { jsonError } from "@/lib/sortiri/ingestApi";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

type RouteContext = { params: Promise<{ workstreamId: string }> };

export async function GET(req: Request, context: RouteContext) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const { workstreamId } = await context.params;
  const url = new URL(req.url);
  const workspaceResult = resolveIngestWorkspaceId(auth, url.searchParams.get("workspaceId") ?? undefined);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const suites = await recommendEvalsForWorkstreamViaIngest(
      auth,
      workspaceResult.workspaceId,
      workstreamId as Id<"workstreams">,
    );
    return Response.json({ suites });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to recommend eval suites";
    return jsonError(message, 500);
  }
}
