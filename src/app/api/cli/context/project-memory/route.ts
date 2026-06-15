import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { getProjectMemoryViaIngest } from "@/lib/sortiri/contextApi";
import { jsonError, parseJsonBody } from "@/lib/sortiri/ingestApi";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export async function POST(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const body = await parseJsonBody<{
    workspaceId?: string;
    projectId?: Id<"projects">;
    query?: string;
    timeWindowDays?: number;
  }>(req);

  const workspaceResult = resolveIngestWorkspaceId(auth, body?.workspaceId);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const result = await getProjectMemoryViaIngest(auth, workspaceResult.workspaceId, {
      projectId: body?.projectId,
      query: body?.query,
      timeWindowDays: body?.timeWindowDays,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load project memory";
    return jsonError(message, 500);
  }
}
