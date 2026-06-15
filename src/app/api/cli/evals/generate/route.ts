import {
  authenticateIngest,
  isIngestAuthResponse,
  resolveIngestWorkspaceId,
} from "@/lib/sortiri/ingestAuth";
import { generateEvalSuiteViaIngest } from "@/lib/sortiri/evalApi";
import { jsonError, parseJsonBody } from "@/lib/sortiri/ingestApi";

type GenerateBody = {
  workspaceId?: string;
  source: "playbook" | "lesson" | "recommendation" | "context_pack" | "known_failure";
  entityId: string;
  failureType?: string;
  title?: string;
  summary?: string;
  recommendedValidation?: string;
  projectId?: string;
  workstreamId?: string;
};

export async function POST(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  const body = await parseJsonBody<GenerateBody>(req);
  if (!body?.source || !body.entityId) {
    return jsonError("source and entityId are required", 400);
  }

  const workspaceResult = resolveIngestWorkspaceId(auth, body.workspaceId);
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  try {
    const result = await generateEvalSuiteViaIngest(auth, workspaceResult.workspaceId, {
      source: body.source,
      entityId: body.entityId,
      failureMeta:
        body.source === "known_failure"
          ? {
              failureType: body.failureType ?? "unknown",
              title: body.title ?? "Known failure",
              summary: body.summary ?? "",
              recommendedValidation: body.recommendedValidation,
              projectId: body.projectId,
              workstreamId: body.workstreamId,
            }
          : undefined,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate eval suite";
    return jsonError(message, 500);
  }
}
