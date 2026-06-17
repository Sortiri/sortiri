import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  authenticateApiKey,
  buildIngestAuthArgs,
  resolveWorkspaceIdFromAuth,
  type HttpAuth,
} from "../lib/httpAuth";
import { parseJsonBody, getQueryParam, requireJsonBody } from "../lib/httpRequest";
import { jsonError, jsonOk, jsonResponse } from "../lib/httpResponse";
import type { FailureInjection } from "../lib/ingestPipelineLib";

function readFailureInjection(request: Request): FailureInjection {
  if (process.env.SORTIRI_ENABLE_FAILURE_INJECTION !== "true") {
    return {};
  }
  return {
    failJournalWrite:
      request.headers.get("x-sortiri-test-fail-journal-write") === "true",
    failConvexWrite:
      request.headers.get("x-sortiri-test-fail-convex-write") === "true",
    forceDeadLetter:
      request.headers.get("x-sortiri-test-force-dead-letter") === "true",
  };
}

function authArgs(auth: HttpAuth, workspaceId: string) {
  return buildIngestAuthArgs(auth, workspaceId);
}

export async function handleHealth(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const authResult = await authenticateApiKey(ctx, request);
  if (!authResult.ok) return authResult.response;
  if (authResult.auth.mode !== "apiKey") {
    return jsonError("API key required", 401);
  }

  const projectId = getQueryParam(request, "projectId");
  const result = await ctx.runQuery(api.apiKeys.getHealthInfo, {
    rawKey: authResult.auth.rawKey,
    projectId: projectId ? (projectId as Id<"projects">) : undefined,
  });

  if (!result.ok) {
    return jsonError(result.revoked ? "API key revoked" : "Invalid API key", result.revoked ? 403 : 401);
  }

  return jsonResponse({
    ok: true,
    workspaceId: result.workspaceId,
    workspaceName: result.workspaceName,
    apiKeyLast4: result.apiKeyLast4,
  });
}

export async function handleIngestEvents(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const authResult = await authenticateApiKey(ctx, request);
  if (!authResult.ok) return authResult.response;

  const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
  if (body instanceof Response) return body;

  const workspaceResult = resolveWorkspaceIdFromAuth(
    authResult.auth,
    body.workspaceId as string | undefined,
  );
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }

  if (
    !body.source ||
    !body.category ||
    !body.type ||
    !body.actor ||
    !body.title
  ) {
    return jsonError("source, category, type, actor, and title are required");
  }

  const injection = readFailureInjection(request);
  const ingestArgs = buildIngestAuthArgs(authResult.auth, workspaceResult.workspaceId);

  try {
    const result = await ctx.runMutation(internal.ingestPipelineHttp.runIngest, {
      ...ingestArgs,
      body,
      route: "/ingest/events",
      apiKeyIdForMetadata:
        authResult.auth.mode === "apiKey" ? authResult.auth.apiKeyId : undefined,
      ...injection,
    });
    return jsonOk({
      duplicate: result.duplicate,
      eventId: result.eventId,
      deliveryId: result.deliveryId,
      status: result.status,
      journalRef: result.journalRef,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record event";
    return jsonError(message, 500);
  }
}

export async function handleIngestArtifacts(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const authResult = await authenticateApiKey(ctx, request);
  if (!authResult.ok) return authResult.response;
  const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
  if (body instanceof Response) return body;
  const workspaceResult = resolveWorkspaceIdFromAuth(
    authResult.auth,
    body.workspaceId as string | undefined,
  );
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }
  try {
    const result = await ctx.runMutation(api.ingest.createArtifact, {
      ...authArgs(authResult.auth, workspaceResult.workspaceId),
      ...(body as Record<string, unknown>),
    } as never);
    return jsonResponse(result as Record<string, unknown>);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed", 500);
  }
}

export async function handleIngestWorkstreamStart(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const authResult = await authenticateApiKey(ctx, request);
  if (!authResult.ok) return authResult.response;
  const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
  if (body instanceof Response) return body;
  const workspaceResult = resolveWorkspaceIdFromAuth(
    authResult.auth,
    body.workspaceId as string | undefined,
  );
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }
  try {
    const result = await ctx.runMutation(api.ingest.startWorkstream, {
      ...authArgs(authResult.auth, workspaceResult.workspaceId),
      ...(body as Record<string, unknown>),
    } as never);
    return jsonResponse(result as Record<string, unknown>);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed", 500);
  }
}

export async function handleIngestWorkstreamFinish(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const authResult = await authenticateApiKey(ctx, request);
  if (!authResult.ok) return authResult.response;
  const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
  if (body instanceof Response) return body;
  const workspaceResult = resolveWorkspaceIdFromAuth(
    authResult.auth,
    body.workspaceId as string | undefined,
  );
  if ("error" in workspaceResult) {
    return jsonError(workspaceResult.error, workspaceResult.status);
  }
  try {
    const result = await ctx.runMutation(api.ingest.finishWorkstream, {
      ...authArgs(authResult.auth, workspaceResult.workspaceId),
      ...(body as Record<string, unknown>),
    } as never);
    return jsonResponse(result as Record<string, unknown>);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed", 500);
  }
}
