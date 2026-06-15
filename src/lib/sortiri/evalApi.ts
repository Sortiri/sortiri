import { api } from "../../../convex/_generated/api";
import {
  getIngestConvexClient,
  type IngestAuthContext,
} from "./ingestApi";
import type { Id } from "../../../convex/_generated/dataModel";

function buildIngestArgs(auth: IngestAuthContext, workspaceId: string) {
  if (auth.mode === "apiKey") {
    return { workspaceId, apiKeyId: auth.apiKeyId };
  }
  return { workspaceId, ingestKey: auth.rawKey };
}

export async function listEvalSuitesViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  limit?: number,
) {
  const convex = getIngestConvexClient();
  return convex.query(api.evalIngest.listSuites, {
    ...buildIngestArgs(auth, workspaceId),
    limit,
  });
}

export async function getEvalSuiteViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  evalSuiteId: string,
) {
  const convex = getIngestConvexClient();
  return convex.query(api.evalIngest.getSuite, {
    ...buildIngestArgs(auth, workspaceId),
    evalSuiteId: evalSuiteId as Id<"evalSuites">,
  });
}

export async function generateEvalSuiteViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  input: {
    source: "playbook" | "lesson" | "recommendation" | "context_pack" | "known_failure";
    entityId: string;
    failureMeta?: {
      failureType: string;
      title: string;
      summary: string;
      recommendedValidation?: string;
      projectId?: string;
      workstreamId?: string;
    };
  },
) {
  const convex = getIngestConvexClient();
  const args = buildIngestArgs(auth, workspaceId);

  switch (input.source) {
    case "playbook":
      return convex.mutation(api.evalIngest.generateFromPlaybook, {
        ...args,
        playbookId: input.entityId as Id<"playbooks">,
      });
    case "lesson":
      return convex.mutation(api.evalIngest.generateFromLesson, {
        ...args,
        lessonId: input.entityId as Id<"lessons">,
      });
    case "recommendation":
      return convex.mutation(api.evalIngest.generateFromRecommendation, {
        ...args,
        recommendationId: input.entityId as Id<"recommendations">,
      });
    case "context_pack":
      return convex.mutation(api.evalIngest.generateFromContextPack, {
        ...args,
        contextPackId: input.entityId as Id<"contextPacks">,
      });
    case "known_failure":
      return convex.mutation(api.evalIngest.generateFromKnownFailure, {
        ...args,
        failureType: input.failureMeta?.failureType ?? "unknown",
        title: input.failureMeta?.title ?? "Known failure",
        summary: input.failureMeta?.summary ?? "",
        recommendedValidation: input.failureMeta?.recommendedValidation,
        projectId: input.failureMeta?.projectId as Id<"projects"> | undefined,
        workstreamId: input.failureMeta?.workstreamId as Id<"workstreams"> | undefined,
      });
    default:
      throw new Error(`Unsupported eval source: ${input.source}`);
  }
}

export async function runEvalSuiteViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  evalSuiteId: string,
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.evalIngest.runSuite, {
    ...buildIngestArgs(auth, workspaceId),
    evalSuiteId: evalSuiteId as Id<"evalSuites">,
  });
}

export async function getEvalRunViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  evalRunId: string,
) {
  const convex = getIngestConvexClient();
  return convex.query(api.evalIngest.getRun, {
    ...buildIngestArgs(auth, workspaceId),
    evalRunId: evalRunId as Id<"evalRuns">,
  });
}

export async function recommendEvalsForWorkstreamViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  workstreamId: string,
) {
  const convex = getIngestConvexClient();
  return convex.query(api.evalIngest.recommendForWorkstream, {
    ...buildIngestArgs(auth, workspaceId),
    workstreamId: workstreamId as Id<"workstreams">,
  });
}

export async function recordEvalCaseResultViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  evalRunId: string,
  body: {
    evalCaseId: string;
    status: string;
    title: string;
    summary?: string;
    output?: string;
    error?: string;
    startedAt?: number;
    completedAt?: number;
  },
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.evalIngest.recordCaseResult, {
    ...buildIngestArgs(auth, workspaceId),
    evalRunId: evalRunId as Id<"evalRuns">,
    evalCaseId: body.evalCaseId as Id<"evalCases">,
    status: body.status as "passed" | "failed" | "skipped" | "needs_review" | "error",
    title: body.title,
    summary: body.summary,
    output: body.output,
    error: body.error,
    startedAt: body.startedAt,
    completedAt: body.completedAt,
  });
}

export async function finalizeEvalRunViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  evalRunId: string,
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.evalIngest.finalizeRun, {
    ...buildIngestArgs(auth, workspaceId),
    evalRunId: evalRunId as Id<"evalRuns">,
  });
}

export async function markEvalRunRunningViaIngest(
  auth: IngestAuthContext,
  workspaceId: string,
  evalRunId: string,
) {
  const convex = getIngestConvexClient();
  return convex.mutation(api.evalIngest.markRunning, {
    ...buildIngestArgs(auth, workspaceId),
    evalRunId: evalRunId as Id<"evalRuns">,
  });
}

export type { IngestAuthContext };
