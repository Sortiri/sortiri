import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { listEvalSuitesViaIngest } from "@/lib/sortiri/evalApi";
import { jsonError } from "@/lib/sortiri/ingestApi";

export async function GET(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const url = new URL(req.url);
  const workspaceResult = resolveIngestWorkspaceId(auth, url.searchParams.get("workspaceId") ?? undefined);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  try {
    const suites = await listEvalSuitesViaIngest(auth, workspaceResult.workspaceId, limit);
    return Response.json({ suites });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list eval suites";
    return jsonError(message, 500);
  }
}
