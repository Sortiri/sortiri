import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { getKnownFailuresViaIngest } from "@/lib/sortiri/contextApi";
import { jsonError, parseJsonBody } from "@/lib/sortiri/ingestApi";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export async function POST(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const body = await parseJsonBody<{
    workspaceId?: string;
    goal?: string;
    files?: string[];
    projectId?: Id<"projects">;
    timeWindowDays?: number;
  }>(req);

  const workspaceResult = resolveIngestWorkspaceId(auth, body?.workspaceId);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const result = await getKnownFailuresViaIngest(auth, workspaceResult.workspaceId, {
      goal: body?.goal,
      files: body?.files,
      projectId: body?.projectId,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load known failures";
    return jsonError(message, 500);
  }
}
