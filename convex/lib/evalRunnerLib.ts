import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { insertEvent } from "./eventsLib";
import {
  docToEvalRun,
  sanitizeEvalOutput,
  type EvalResultRecord,
  type EvalRunRecord,
} from "./evalLib";

type DbWriteCtx = Pick<MutationCtx, "db">;

export type CaseResultInput = {
  evalCaseId: Id<"evalCases">;
  status: Doc<"evalResults">["status"];
  title: string;
  summary?: string;
  output?: string;
  error?: string;
  evidenceEventIds?: Id<"events">[];
  evidenceArtifactIds?: Id<"artifacts">[];
  evidenceWorkstreamIds?: Id<"workstreams">[];
  startedAt?: number;
  completedAt?: number;
};

export function computeRunStatus(
  results: Array<{ status: Doc<"evalResults">["status"]; required: boolean }>,
): Doc<"evalRuns">["status"] {
  if (results.length === 0) return "error";

  const hasError = results.some((r) => r.status === "error");
  if (hasError) return "error";

  const requiredFailed = results.some(
    (r) => r.required && (r.status === "failed" || r.status === "error"),
  );
  if (requiredFailed) return "failed";

  const needsReview = results.some((r) => r.status === "needs_review");
  if (needsReview) return "needs_review";

  const optionalFailed = results.some((r) => !r.required && r.status === "failed");
  if (optionalFailed) return "needs_review";

  const allPassedOrSkipped = results.every(
    (r) => r.status === "passed" || r.status === "skipped",
  );
  return allPassedOrSkipped ? "passed" : "failed";
}

export function buildRunSummary(
  results: EvalResultRecord[],
): string {
  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const needsReview = results.filter((r) => r.status === "needs_review").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;
  return `${passed} passed, ${failed} failed, ${needsReview} needs review, ${skipped} skipped, ${errors} errors`;
}

export async function createEvalRunDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    evalSuiteId: Id<"evalSuites">;
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    recommendationId?: Id<"recommendations">;
    contextPackId?: Id<"contextPacks">;
    createdBy?: Doc<"evalRuns">["createdBy"];
  },
): Promise<Id<"evalRuns">> {
  const now = Date.now();
  return ctx.db.insert("evalRuns", {
    workspaceId: input.workspaceId,
    evalSuiteId: input.evalSuiteId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    recommendationId: input.recommendationId,
    contextPackId: input.contextPackId,
    status: "queued",
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function markEvalRunRunning(
  ctx: DbWriteCtx,
  evalRunId: Id<"evalRuns">,
): Promise<void> {
  const now = Date.now();
  await ctx.db.patch(evalRunId, {
    status: "running",
    startedAt: now,
    updatedAt: now,
  });
}

export async function recordEvalCaseResult(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    evalRunId: Id<"evalRuns">;
    result: CaseResultInput;
  },
): Promise<Id<"evalResults">> {
  const now = Date.now();
  return ctx.db.insert("evalResults", {
    workspaceId: input.workspaceId,
    evalRunId: input.evalRunId,
    evalCaseId: input.result.evalCaseId,
    status: input.result.status,
    title: input.result.title,
    summary: input.result.summary,
    output: sanitizeEvalOutput(input.result.output),
    error: input.result.error,
    evidenceEventIds: input.result.evidenceEventIds,
    evidenceArtifactIds: input.result.evidenceArtifactIds,
    evidenceWorkstreamIds: input.result.evidenceWorkstreamIds,
    startedAt: input.result.startedAt ?? now,
    completedAt: input.result.completedAt ?? now,
    createdAt: now,
  });
}

export async function finalizeEvalRun(
  ctx: DbWriteCtx,
  evalRunId: Id<"evalRuns">,
  options?: { actor?: { type: "human" | "agent" | "system"; name?: string; email?: string; id?: string } },
): Promise<EvalRunRecord> {
  const runDoc = await ctx.db.get(evalRunId);
  if (!runDoc) throw new Error("Eval run not found");

  const resultDocs = await ctx.db
    .query("evalResults")
    .withIndex("by_run", (q) => q.eq("evalRunId", evalRunId))
    .collect();

  const caseIds = [...new Set(resultDocs.map((r) => r.evalCaseId))];
  const caseMap = new Map<Id<"evalCases">, Doc<"evalCases">>();
  for (const caseId of caseIds) {
    const evalCase = await ctx.db.get(caseId);
    if (evalCase) caseMap.set(caseId, evalCase);
  }

  const aggregateInput = resultDocs.map((result) => ({
    status: result.status,
    required: caseMap.get(result.evalCaseId)?.required ?? true,
  }));

  const status = computeRunStatus(aggregateInput);
  const summary = buildRunSummary(resultDocs.map((doc) => ({
    id: doc._id,
    workspaceId: doc.workspaceId,
    evalRunId: doc.evalRunId,
    evalCaseId: doc.evalCaseId,
    status: doc.status,
    title: doc.title,
    summary: doc.summary,
    output: doc.output,
    error: doc.error,
    createdAt: doc.createdAt,
  })));

  const now = Date.now();
  await ctx.db.patch(evalRunId, {
    status,
    summary,
    completedAt: now,
    updatedAt: now,
  });

  const suite = await ctx.db.get(runDoc.evalSuiteId);
  const eventType =
    status === "passed"
      ? "eval_run.passed"
      : status === "needs_review"
        ? "eval_run.needs_review"
        : status === "failed"
          ? "eval_run.failed"
          : "eval_run.failed";

  await insertEvent(ctx, {
    workspaceId: runDoc.workspaceId,
    source: "system",
    category: "system_event",
    type: eventType,
    actor: options?.actor ?? { type: "system", name: "Sortiri" },
    title: `Eval run ${status}: ${suite?.title ?? runDoc.evalSuiteId}`,
    summary,
    entity: { type: "other", id: evalRunId, name: suite?.title ?? "Eval run" },
    visibility: "primary",
    importance: status === "failed" || status === "error" ? "high" : "normal",
    occurredAt: now,
  });

  const updated = await ctx.db.get(evalRunId);
  return docToEvalRun(updated!);
}

export async function recordEvalRunStartedEvent(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    evalRunId: Id<"evalRuns">;
    suiteTitle: string;
    actor?: { type: "human" | "agent" | "system"; name?: string; email?: string; id?: string };
  },
): Promise<void> {
  await insertEvent(ctx, {
    workspaceId: input.workspaceId,
    source: "system",
    category: "system_event",
    type: "eval_run.started",
    actor: input.actor ?? { type: "system", name: "Sortiri" },
    title: `Eval run started: ${input.suiteTitle}`,
    entity: { type: "other", id: input.evalRunId, name: input.suiteTitle },
    visibility: "primary",
    importance: "normal",
    occurredAt: Date.now(),
  });
}

export async function recordEvalSuiteGeneratedEvent(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    evalSuiteId: Id<"evalSuites">;
    title: string;
    summary: string;
    priority?: Doc<"evalSuites">["priority"];
    actor?: { type: "human" | "agent" | "system"; name?: string; email?: string; id?: string };
  },
): Promise<void> {
  await insertEvent(ctx, {
    workspaceId: input.workspaceId,
    source: "system",
    category: "system_event",
    type: "eval_suite.generated",
    actor: input.actor ?? { type: "system", name: "Sortiri" },
    title: `Eval suite generated: ${input.title}`,
    summary: input.summary,
    entity: { type: "other", id: input.evalSuiteId, name: input.title },
    visibility: "primary",
    importance: input.priority === "critical" ? "high" : "normal",
    occurredAt: Date.now(),
  });
}
