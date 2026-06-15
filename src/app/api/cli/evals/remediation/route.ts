import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { listEvalRemediationsViaIngest } from "@/lib/sortiri/evalApi";
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

  const limit = url.searchParams.get("limit");
  try {
    const remediations = await listEvalRemediationsViaIngest(
      auth,
      workspaceResult.workspaceId,
      limit ? Number(limit) : undefined,
    );
    return Response.json({ remediations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list remediations";
    return jsonError(message, 500);
  }
}
