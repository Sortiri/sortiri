import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  authenticateApiKey,
  buildIngestAuthArgs,
  getIntegrationServerKey,
  resolveWorkspaceIdFromAuth,
} from "../lib/httpAuth";
import { parseJsonBody, getQueryParam, requireJsonBody } from "../lib/httpRequest";
import { jsonError, jsonResponse } from "../lib/httpResponse";
import { buildSlackSignatureHeader } from "../lib/integrations/webhookVerify";
import { decryptSecret } from "../lib/secretsLib";
import { handleObservabilityWebhook } from "./webhookHandlers";

function normalizeCliPath(pathname: string, prefix: "cli" | "mcp"): string {
  const normalized = pathname.replace(new RegExp(`^/${prefix}`), "/cli");
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

function matchPath(path: string, pattern: string): Record<string, string> | null {
  const pathParts = path.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  if (pathParts.length !== patternParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const part = patternParts[i];
    const value = pathParts[i];
    if (part.startsWith(":")) {
      params[part.slice(1)] = value;
    } else if (part !== value) {
      return null;
    }
  }
  return params;
}

export async function dispatchCliOrMcp(
  ctx: ActionCtx,
  request: Request,
  prefix: "cli" | "mcp",
): Promise<Response> {
  const url = new URL(request.url);
  const path = normalizeCliPath(url.pathname, prefix);
  const method = request.method;

  if (path === "/cli/setup/consume" && method === "POST") {
    const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
    if (body instanceof Response) return body;
    if (!body.setupToken || typeof body.setupToken !== "string") {
      return jsonError("setupToken is required");
    }
    try {
      const result = await ctx.runMutation(api.cliSetup.completeSetup, {
        rawToken: body.setupToken.trim(),
        repo: body.repo as never,
        editor: body.editor as never,
      });
      const apiUrl =
        process.env.SORTIRI_API_URL?.replace(/\/$/, "") ??
        process.env.CONVEX_SITE_URL?.replace(/\/$/, "") ??
        "";
      return jsonResponse({
        ok: true,
        apiUrl,
        apiKey: result.apiKey,
        workspaceId: result.workspaceExternalId,
        projectId: result.projectId,
        projectName: result.projectName,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Setup failed";
      const status =
        message.includes("expired") ||
        message.includes("used") ||
        message.includes("revoked") ||
        message.includes("Invalid token")
          ? 401
          : 500;
      return jsonError(message, status);
    }
  }

  const authResult = await authenticateApiKey(ctx, request);
  if (!authResult.ok) return authResult.response;

  const auth = authResult.auth;
  const workspaceFromQuery = getQueryParam(request, "workspaceId") ?? undefined;

  async function workspaceIdFromBody(body?: Record<string, unknown>) {
    const ws = resolveWorkspaceIdFromAuth(
      auth,
      (body?.workspaceId as string | undefined) ?? workspaceFromQuery,
    );
    if ("error" in ws) return ws;
    return { workspaceId: ws.workspaceId };
  }

  try {
    if (path === "/cli/context/packs" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      if (!body.goal || typeof body.goal !== "string") {
        return jsonError("goal is required");
      }
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.contextIngest.createAndGenerate, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        goal: body.goal,
        projectId: body.projectId as Id<"projects"> | undefined,
        workstreamId: body.workstreamId as Id<"workstreams"> | undefined,
        entityId: body.entityId as Id<"entities"> | undefined,
        title: body.title as string | undefined,
        request: {
          files: body.files as string[] | undefined,
          timeWindowMs: body.timeWindowDays
            ? Number(body.timeWindowDays) * 24 * 60 * 60 * 1000
            : undefined,
        },
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const packMatch = matchPath(path, "/cli/context/packs/:id");
    if (packMatch && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.contextIngest.getFormatted, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        contextPackId: packMatch.id as Id<"contextPacks">,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    if (path === "/cli/context/project-memory" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.contextIngest.getProjectMemory, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        projectId: body.projectId as Id<"projects"> | undefined,
        query: body.query as string | undefined,
        timeWindowMs: body.timeWindowDays
          ? Number(body.timeWindowDays) * 24 * 60 * 60 * 1000
          : undefined,
      });
      return jsonResponse({ memory: result });
    }

    if (path === "/cli/context/entity-memory" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.contextIngest.getEntityMemory, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        entityKeyOrId: (body.entityKeyOrId ?? body.entityId) as string,
        timeWindowMs: body.timeWindowDays
          ? Number(body.timeWindowDays) * 24 * 60 * 60 * 1000
          : undefined,
      });
      return jsonResponse({ memory: result });
    }

    if (path === "/cli/context/known-failures" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.contextIngest.getKnownFailures, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        goal: body.goal as string | undefined,
        files: body.files as string[] | undefined,
        projectId: body.projectId as Id<"projects"> | undefined,
        timeWindowMs: body.timeWindowDays
          ? Number(body.timeWindowDays) * 24 * 60 * 60 * 1000
          : undefined,
      });
      return jsonResponse({ failures: result });
    }

    if (path === "/cli/context/validation-requirements" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.contextIngest.getValidationRequirements, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        goal: (body.goal as string) ?? "",
        files: body.files as string[] | undefined,
        sources: body.sources as string[] | undefined,
      });
      return jsonResponse({ requirements: result });
    }

    if (path === "/cli/context/recommended-playbook" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.contextIngest.getRecommendedPlaybook, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        goal: (body.goal as string) ?? "",
        projectId: body.projectId as Id<"projects"> | undefined,
      });
      return jsonResponse({ playbook: result });
    }

    if (path === "/cli/recommendations" && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const limit = getQueryParam(request, "limit");
      const result = await ctx.runQuery(api.recommendationIngest.listOpen, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        limit: limit ? Number(limit) : undefined,
      });
      return jsonResponse({ recommendations: result });
    }

    if (path === "/cli/recommendations/generate" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.recommendationIngest.generateForWorkspace, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const recMatch = matchPath(path, "/cli/recommendations/:id");
    if (recMatch && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.recommendationIngest.getById, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        recommendationId: recMatch.id as Id<"recommendations">,
      });
      return jsonResponse({ recommendation: result });
    }

    const recConvert = matchPath(path, "/cli/recommendations/:id/convert");
    if (recConvert && method === "POST") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.recommendationIngest.convertToWorkstream, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        recommendationId: recConvert.id as Id<"recommendations">,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const recPack = matchPath(path, "/cli/recommendations/:id/context-pack");
    if (recPack && method === "POST") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.recommendationIngest.generateContextPack, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        recommendationId: recPack.id as Id<"recommendations">,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    if (path === "/cli/evals" && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const limit = getQueryParam(request, "limit");
      const result = await ctx.runQuery(api.evalIngest.listSuites, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        limit: limit ? Number(limit) : undefined,
      });
      return jsonResponse({ suites: result });
    }

    if (path === "/cli/evals/generate" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const source = body.source as string;
      const entityId = body.entityId as string;
      const args = buildIngestAuthArgs(auth, ws.workspaceId);
      let result;
      switch (source) {
        case "playbook":
          result = await ctx.runMutation(api.evalIngest.generateFromPlaybook, {
            ...args,
            playbookId: entityId as Id<"playbooks">,
          });
          break;
        case "lesson":
          result = await ctx.runMutation(api.evalIngest.generateFromLesson, {
            ...args,
            lessonId: entityId as Id<"lessons">,
          });
          break;
        case "recommendation":
          result = await ctx.runMutation(api.evalIngest.generateFromRecommendation, {
            ...args,
            recommendationId: entityId as Id<"recommendations">,
          });
          break;
        case "context_pack":
          result = await ctx.runMutation(api.evalIngest.generateFromContextPack, {
            ...args,
            contextPackId: entityId as Id<"contextPacks">,
          });
          break;
        case "known_failure":
          result = await ctx.runMutation(api.evalIngest.generateFromKnownFailure, {
            ...args,
            failureType: (body.failureMeta as Record<string, string>)?.failureType ?? "unknown",
            title: (body.failureMeta as Record<string, string>)?.title ?? "Known failure",
            summary: (body.failureMeta as Record<string, string>)?.summary ?? "",
            recommendedValidation: (body.failureMeta as Record<string, string>)
              ?.recommendedValidation,
            projectId: (body.failureMeta as Record<string, string>)?.projectId as
              | Id<"projects">
              | undefined,
            workstreamId: (body.failureMeta as Record<string, string>)?.workstreamId as
              | Id<"workstreams">
              | undefined,
          });
          break;
        default:
          return jsonError(`Unsupported eval source: ${source}`);
      }
      return jsonResponse(result as Record<string, unknown>);
    }

    if (path === "/cli/evals/remediation" && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const limit = getQueryParam(request, "limit");
      const result = await ctx.runQuery(api.recommendationIngest.listRemediations, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        limit: limit ? Number(limit) : undefined,
      });
      return jsonResponse({ remediations: result });
    }

    if (path === "/cli/evals/remediation/generate" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.recommendationIngest.generateFromEvalRun, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        evalRunId: body.evalRunId as Id<"evalRuns">,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const remId = matchPath(path, "/cli/evals/remediation/:recommendationId");
    if (remId && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.recommendationIngest.getById, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        recommendationId: remId.recommendationId as Id<"recommendations">,
      });
      return jsonResponse({ remediation: result });
    }

    if (path === "/cli/evals/remediation/rerun" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.evalIngest.rerunForRemediation, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        recommendationId: body.recommendationId as Id<"recommendations"> | undefined,
        workstreamId: body.workstreamId as Id<"workstreams"> | undefined,
        evalSuiteId: body.evalSuiteId as Id<"evalSuites">,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const suiteRun = matchPath(path, "/cli/evals/:suiteId/run");
    if (suiteRun && method === "POST") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.evalIngest.runSuite, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        evalSuiteId: suiteRun.suiteId as Id<"evalSuites">,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const suiteGet = matchPath(path, "/cli/evals/:suiteId");
    if (suiteGet && method === "GET" && !path.endsWith("/run")) {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.evalIngest.getSuite, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        evalSuiteId: suiteGet.suiteId as Id<"evalSuites">,
      });
      return jsonResponse({ suite: result });
    }

    const runMatch = matchPath(path, "/cli/evals/runs/:runId");
    if (runMatch && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.evalIngest.getRun, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        evalRunId: runMatch.runId as Id<"evalRuns">,
      });
      return jsonResponse({ run: result });
    }

    const runResults = matchPath(path, "/cli/evals/runs/:runId/results");
    if (runResults && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.evalIngest.recordCaseResult, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        evalRunId: runResults.runId as Id<"evalRuns">,
        evalCaseId: body.evalCaseId as Id<"evalCases">,
        status: body.status as "passed" | "failed" | "skipped" | "needs_review" | "error",
        title: body.title as string,
        summary: body.summary as string | undefined,
        output: body.output as string | undefined,
        error: body.error as string | undefined,
        startedAt: body.startedAt as number | undefined,
        completedAt: body.completedAt as number | undefined,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const runFinalize = matchPath(path, "/cli/evals/runs/:runId/finalize");
    if (runFinalize && method === "POST") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.evalIngest.finalizeRun, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        evalRunId: runFinalize.runId as Id<"evalRuns">,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const runMark = matchPath(path, "/cli/evals/runs/:runId/mark-running");
    if (runMark && method === "POST") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.evalIngest.markRunning, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        evalRunId: runMark.runId as Id<"evalRuns">,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const recommendWs = matchPath(path, "/cli/evals/recommend/workstream/:workstreamId");
    if (recommendWs && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.evalIngest.recommendForWorkstream, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        workstreamId: recommendWs.workstreamId as Id<"workstreams">,
      });
      return jsonResponse({ recommendations: result });
    }

    if (path === "/cli/decisions" && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const limit = getQueryParam(request, "limit");
      const result = await ctx.runQuery(api.decisionIngest.listDecisionsForIngest, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        limit: limit ? Number(limit) : undefined,
      });
      return jsonResponse({ decisions: result });
    }

    if (path === "/cli/decisions" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.decisionIngest.recordDecision, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        title: body.title as string,
        summary: body.summary as string | undefined,
        decisionType: body.decisionType as never,
        projectId: body.projectId as Id<"projects"> | undefined,
        workstreamId: body.workstreamId as Id<"workstreams"> | undefined,
        rationale: body.rationale as string | undefined,
        expectedOutcome: body.expectedOutcome as string | undefined,
        rollbackPlan: body.rollbackPlan as string | undefined,
        tags: body.tags as string[] | undefined,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    if (path === "/cli/decisions/candidates" && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const limit = getQueryParam(request, "limit");
      const result = await ctx.runQuery(api.decisionIngest.listCandidatesForIngest, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        limit: limit ? Number(limit) : undefined,
      });
      return jsonResponse({ candidates: result });
    }

    const confirmCandidate = matchPath(path, "/cli/decisions/candidates/:id/confirm");
    if (confirmCandidate && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.decisionIngest.confirmCandidate, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        candidateId: confirmCandidate.id as Id<"decisionCandidates">,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const dismissCandidate = matchPath(path, "/cli/decisions/candidates/:id/dismiss");
    if (dismissCandidate && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.decisionIngest.dismissCandidate, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        candidateId: dismissCandidate.id as Id<"decisionCandidates">,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const decisionMatch = matchPath(path, "/cli/decisions/:id");
    if (decisionMatch && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.decisionIngest.getDecisionForIngest, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        decisionId: decisionMatch.id as Id<"decisions">,
      });
      return jsonResponse({ decision: result });
    }

    const decisionLink = matchPath(path, "/cli/decisions/:id/link");
    if (decisionLink && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.decisionIngest.linkToWorkstream, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        decisionId: decisionLink.id as Id<"decisions">,
        workstreamId: body.workstreamId as Id<"workstreams">,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const decisionRollback = matchPath(path, "/cli/decisions/:id/rollback");
    if (decisionRollback && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.decisionIngest.createRollback, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        decisionId: decisionRollback.id as Id<"decisions">,
        title: (body.title as string) ?? "Rollback",
        summary: body.summary as string | undefined,
        reason: body.reason as string | undefined,
        workstreamId: body.workstreamId as Id<"workstreams"> | undefined,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    if (path === "/cli/incidents" && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const limit = getQueryParam(request, "limit");
      const status = getQueryParam(request, "status") ?? undefined;
      const severity = getQueryParam(request, "severity") ?? undefined;
      const result = await ctx.runQuery(api.incidentIngest.listIncidents, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        status: status as never,
        severity: severity as never,
        limit: limit ? Number(limit) : undefined,
      });
      return jsonResponse({ incidents: result });
    }

    if (path === "/cli/incidents" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.incidentIngest.recordIncident, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        title: body.title as string,
        summary: body.summary as string | undefined,
        severity: (body.severity as never) ?? "error",
        projectId: body.projectId as Id<"projects"> | undefined,
        workstreamId: body.workstreamId as Id<"workstreams"> | undefined,
        service: body.service as string | undefined,
        environment: body.environment as string | undefined,
        sourceRef: body.sourceRef as never,
        startedAt: body.startedAt as number | undefined,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    if (path === "/cli/incidents/signals" && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const limit = getQueryParam(request, "limit");
      const severity = getQueryParam(request, "severity") ?? undefined;
      const incidentId = getQueryParam(request, "incidentId") ?? undefined;
      const result = await ctx.runQuery(api.incidentIngest.listObservabilitySignals, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        incidentId: incidentId as Id<"incidents"> | undefined,
        severity: severity as never,
        limit: limit ? Number(limit) : undefined,
      });
      return jsonResponse({ signals: result });
    }

    const incidentMatch = matchPath(path, "/cli/incidents/:id");
    if (incidentMatch && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.incidentIngest.getIncident, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        incidentId: incidentMatch.id as Id<"incidents">,
      });
      return jsonResponse({ incident: result });
    }

    const incidentResolve = matchPath(path, "/cli/incidents/:id/resolve");
    if (incidentResolve && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.incidentIngest.resolveIncident, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        incidentId: incidentResolve.id as Id<"incidents">,
        rootCause: body.rootCause as string | undefined,
        mitigation: body.mitigation as string | undefined,
        rollbackSummary: body.rollbackSummary as string | undefined,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const incidentRollback = matchPath(path, "/cli/incidents/:id/rollback");
    if (incidentRollback && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runMutation(api.incidentIngest.createRollback, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        incidentId: incidentRollback.id as Id<"incidents">,
        title: (body.title as string) ?? "Rollback",
        summary: body.summary as string | undefined,
        reason: body.reason as string | undefined,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    const incidentLink = matchPath(path, "/cli/incidents/:id/link");
    if (incidentLink && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const ingestArgs = {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        incidentId: incidentLink.id as Id<"incidents">,
      };
      if (body.workstreamId) {
        const result = await ctx.runMutation(api.incidentIngest.linkToWorkstream, {
          ...ingestArgs,
          workstreamId: body.workstreamId as Id<"workstreams">,
        });
        return jsonResponse(result as Record<string, unknown>);
      }
      if (body.decisionId) {
        const result = await ctx.runMutation(api.incidentIngest.linkToDecision, {
          ...ingestArgs,
          decisionId: body.decisionId as Id<"decisions">,
        });
        return jsonResponse(result as Record<string, unknown>);
      }
      return jsonError("workstreamId or decisionId is required", 400);
    }

    if (path === "/cli/observability/test-webhook" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const testPayload = body.payload ?? {
        source: "cli",
        signalType: "deploy_failed",
        title: "CLI test: production deploy failed",
        severity: "error",
        service: "api",
        environment: "production",
        event_id: `cli-test-${Date.now()}`,
      };
      const rawBody = JSON.stringify(testPayload);
      const secretResult = await ctx.runQuery(
        api.integrations.observability.getWebhookSecretForVerification,
        { workspaceExternalId: ws.workspaceId, serverKey: getIntegrationServerKey() },
      );
      if (!secretResult?.encryptedSecret) {
        return jsonError("No active observability signing secret", 401);
      }
      let signingSecret: string;
      try {
        signingSecret = await decryptSecret(secretResult.encryptedSecret);
      } catch {
        return jsonError("Signing secret decryption failed", 500);
      }
      const { timestamp: ts, signature } = await buildSlackSignatureHeader(rawBody, signingSecret);
      const webhookRequest = new Request(
        `https://sortiri.local/webhooks/observability?workspaceId=${encodeURIComponent(ws.workspaceId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sortiri-request-timestamp": ts,
            "x-sortiri-signature": signature,
          },
          body: rawBody,
        },
      );
      return handleObservabilityWebhook(ctx, webhookRequest);
    }

    if (path === "/cli/reliability" && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const status = getQueryParam(request, "status") ?? undefined;
      const source = getQueryParam(request, "source") ?? undefined;
      const limit = getQueryParam(request, "limit");
      const result = await ctx.runQuery(api.reliabilityIngest.listDeliveriesForIngest, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        status: status as never,
        source,
        limit: limit ? Number(limit) : undefined,
      });
      return jsonResponse({ deliveries: result });
    }

    if (path === "/cli/reliability/dead-letters" && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const limit = getQueryParam(request, "limit");
      const result = await ctx.runQuery(api.reliabilityIngest.listDeadLettersForIngest, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        limit: limit ? Number(limit) : undefined,
      });
      return jsonResponse({ deadLetters: result });
    }

    if (path === "/cli/reliability/health" && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const result = await ctx.runQuery(api.reliabilityIngest.getDeliveryHealthForIngest, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
      });
      return jsonResponse({ health: result });
    }

    if (path === "/cli/reliability/journal/list" && method === "GET") {
      const ws = await workspaceIdFromBody();
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const source = getQueryParam(request, "source") ?? undefined;
      const limit = getQueryParam(request, "limit");
      const result = await ctx.runQuery(api.reliabilityIngest.listJournalEntriesForIngest, {
        ...buildIngestAuthArgs(auth, ws.workspaceId),
        source: source ?? undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return jsonResponse({ entries: result });
    }

    if (path === "/cli/reliability/replay" && method === "POST") {
      const body = requireJsonBody(await parseJsonBody<Record<string, unknown>>(request));
      if (body instanceof Response) return body;
      const ws = await workspaceIdFromBody(body);
      if ("error" in ws) return jsonError(ws.error, ws.status);
      const ingestArgs = buildIngestAuthArgs(auth, ws.workspaceId);

      let deliveryId = body.deliveryId as string | undefined;
      let journalRef = body.journalRef as string | undefined;

      if (body.deadLetterId) {
        const deadLetter = await ctx.runQuery(api.reliabilityIngest.getDeadLetterForIngest, {
          ...ingestArgs,
          deadLetterId: body.deadLetterId as Id<"ingestDeadLetters">,
        });
        if (!deadLetter) return jsonError("Dead letter not found", 404);
        deliveryId = deadLetter.deliveryId ?? deliveryId;
        journalRef = deadLetter.journalRef ?? journalRef;
      }

      if (!deliveryId) {
        return jsonError("deliveryId or deadLetterId with linked delivery is required", 400);
      }

      if (body.payload !== undefined) {
        const result = await ctx.runMutation(api.reliabilityIngest.replayDeliveryForIngest, {
          ...ingestArgs,
          deliveryId: deliveryId as Id<"ingestDeliveries">,
          payload: body.payload,
        });
        return jsonResponse(result as Record<string, unknown>);
      }

      const delivery = await ctx.runQuery(api.reliabilityIngest.getDeliveryForIngest, {
        ...ingestArgs,
        deliveryId: deliveryId as Id<"ingestDeliveries">,
      });
      const ref = journalRef ?? delivery?.journalRef;
      if (!ref) return jsonError("No journal ref available for replay", 400);

      const result = await ctx.runMutation(internal.ingestPipelineHttp.replayDelivery, {
        ...ingestArgs,
        deliveryId: deliveryId as Id<"ingestDeliveries">,
        journalRef: ref,
      });
      return jsonResponse(result as Record<string, unknown>);
    }

    return jsonError("Not found", 404);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Request failed", 500);
  }
}
