import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  authenticateIngest,
  isIngestAuthResponse,
  unauthorizedResponse,
} from "@/lib/sortiri/ingestAuth";
import { getIngestConvexClient } from "@/lib/sortiri/ingestApi";
import { api } from "../../../../../convex/_generated/api";

export async function GET(req: Request) {
  const auth = await authenticateIngest(req);
  if (isIngestAuthResponse(auth)) {
    return auth;
  }

  if (auth.mode !== "apiKey") {
    return unauthorizedResponse("API key required");
  }

  const url = new URL(req.url);
  const projectIdParam = url.searchParams.get("projectId");

  try {
    const convex = getIngestConvexClient();
    const result = await convex.query(api.apiKeys.getHealthInfo, {
      rawKey: auth.rawKey,
      projectId: projectIdParam
        ? (projectIdParam as Id<"projects">)
        : undefined,
    });

    if (!result.ok) {
      if ("revoked" in result && result.revoked) {
        return unauthorizedResponse("API key revoked");
      }
      if ("projectInvalid" in result && result.projectInvalid) {
        return Response.json({ error: "Project not found" }, { status: 404 });
      }
      return unauthorizedResponse("Invalid API key");
    }

    return Response.json({
      ok: true,
      workspaceId: result.workspaceId,
      workspaceName: result.workspaceName,
      apiKeyLast4: result.apiKeyLast4,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health check failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
