import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getIngestConvexClient } from "./ingestApi";

export type IngestAuth =
  | {
      mode: "apiKey";
      rawKey: string;
      workspaceExternalId: string;
      apiKeyId: Id<"apiKeys">;
    }
  | { mode: "dev"; rawKey: string };

export function unauthorizedResponse(message = "Unauthorized") {
  return Response.json({ error: message }, { status: 401 });
}

export async function authenticateIngest(req: Request): Promise<IngestAuth | Response> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorizedResponse();
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return unauthorizedResponse();
  }

  const devKey = process.env.SORTIRI_DEV_INGEST_KEY;
  if (devKey && token === devKey) {
    return { mode: "dev", rawKey: token };
  }

  const convex: ConvexHttpClient = getIngestConvexClient();
  const result = await convex.query(api.apiKeys.verifyForIngest, { rawKey: token });
  if (!result.valid) {
    const message = result.revoked ? "API key revoked" : "Invalid API key";
    return unauthorizedResponse(message);
  }

  if (!result.workspaceExternalId || !result.apiKeyId) {
    return unauthorizedResponse("Invalid API key");
  }

  return {
    mode: "apiKey",
    rawKey: token,
    workspaceExternalId: result.workspaceExternalId,
    apiKeyId: result.apiKeyId as Id<"apiKeys">,
  };
}

export function isIngestAuthResponse(value: IngestAuth | Response): value is Response {
  return value instanceof Response;
}

export function resolveIngestWorkspaceId(
  auth: IngestAuth,
  bodyWorkspaceId: string | undefined,
): { workspaceId: string } | { error: string; status: number } {
  const workspaceId = auth.mode === "apiKey" ? auth.workspaceExternalId : bodyWorkspaceId;
  if (!workspaceId) {
    return { error: "workspaceId is required", status: 400 };
  }
  if (auth.mode === "apiKey" && bodyWorkspaceId && bodyWorkspaceId !== workspaceId) {
    return { error: "Workspace mismatch", status: 403 };
  }
  return { workspaceId };
}
