import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";
import { jsonError } from "./httpResponse";
import { validateIntegrationServerKey } from "./reliabilityIngestAuth";

export type HttpApiKeyAuth = {
  mode: "apiKey";
  rawKey: string;
  workspaceExternalId: string;
  apiKeyId: Id<"apiKeys">;
};

export type HttpDevAuth = {
  mode: "dev";
  rawKey: string;
};

export type HttpIntegrationAuth = {
  mode: "integration";
  serverKey: string;
  workspaceExternalId: string;
};

export type HttpAuth = HttpApiKeyAuth | HttpDevAuth | HttpIntegrationAuth;

export type HttpAuthResult =
  | { ok: true; auth: HttpAuth }
  | { ok: false; response: Response };

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace("Bearer ", "").trim();
  return token || null;
}

export async function authenticateApiKey(
  ctx: ActionCtx,
  request: Request,
): Promise<HttpAuthResult> {
  const token = extractBearerToken(request);
  if (!token) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }

  const devKey = process.env.SORTIRI_DEV_INGEST_KEY;
  if (devKey && token === devKey) {
    return { ok: true, auth: { mode: "dev", rawKey: token } };
  }

  const result = await ctx.runQuery(api.apiKeys.verifyForIngest, { rawKey: token });
  if (!result.valid) {
    const message = result.revoked ? "API key revoked" : "Invalid API key";
    const status = result.revoked ? 403 : 401;
    return { ok: false, response: jsonError(message, status) };
  }

  if (!result.workspaceExternalId || !result.apiKeyId) {
    return { ok: false, response: jsonError("Invalid API key", 401) };
  }

  return {
    ok: true,
    auth: {
      mode: "apiKey",
      rawKey: token,
      workspaceExternalId: result.workspaceExternalId,
      apiKeyId: result.apiKeyId as Id<"apiKeys">,
    },
  };
}

export function resolveWorkspaceIdFromAuth(
  auth: HttpAuth,
  bodyWorkspaceId?: string,
): { workspaceId: string } | { error: string; status: number } {
  if (auth.mode === "apiKey") {
    if (bodyWorkspaceId && bodyWorkspaceId !== auth.workspaceExternalId) {
      return { error: "Workspace mismatch", status: 403 };
    }
    return { workspaceId: auth.workspaceExternalId };
  }
  if (auth.mode === "integration") {
    return { workspaceId: auth.workspaceExternalId };
  }
  if (!bodyWorkspaceId) {
    return { error: "workspaceId is required", status: 400 };
  }
  return { workspaceId: bodyWorkspaceId };
}

export function buildIngestAuthArgs(auth: HttpAuth, workspaceId: string) {
  if (auth.mode === "apiKey") {
    return { workspaceId, apiKeyId: auth.apiKeyId };
  }
  if (auth.mode === "integration") {
    return {
      workspaceId,
      serverKey: auth.serverKey,
      workspaceExternalId: auth.workspaceExternalId,
    };
  }
  return { workspaceId, ingestKey: auth.rawKey };
}

export function getIntegrationServerKey(): string {
  const key = process.env.SORTIRI_INTEGRATION_SERVER_KEY;
  if (!key) {
    throw new Error("Missing SORTIRI_INTEGRATION_SERVER_KEY");
  }
  return key;
}

export function authenticateIntegrationRequest(
  request: Request,
  workspaceExternalId: string | null,
): HttpAuthResult {
  if (!workspaceExternalId) {
    return { ok: false, response: jsonError("workspaceId is required", 400) };
  }
  let serverKey: string;
  try {
    serverKey = getIntegrationServerKey();
  } catch {
    return {
      ok: false,
      response: jsonError("Integration server key is not configured", 500),
    };
  }
  try {
    validateIntegrationServerKey(serverKey);
  } catch {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }
  return {
    ok: true,
    auth: { mode: "integration", serverKey, workspaceExternalId },
  };
}
