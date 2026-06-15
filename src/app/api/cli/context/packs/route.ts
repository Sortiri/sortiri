import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { createContextPackViaIngest } from "@/lib/sortiri/contextApi";
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
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    entityId?: Id<"entities">;
    files?: string[];
    timeWindowDays?: number;
    title?: string;
  }>(req);

  if (!body?.goal?.trim()) {
    return jsonError("goal is required");
  }

  const workspaceResult = resolveIngestWorkspaceId(auth, body.workspaceId);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const result = await createContextPackViaIngest(auth, workspaceResult.workspaceId, {
      goal: body.goal,
      projectId: body.projectId,
      workstreamId: body.workstreamId,
      entityId: body.entityId,
      files: body.files,
      timeWindowDays: body.timeWindowDays,
      title: body.title,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create context pack";
    return jsonError(message, 500);
  }
}
