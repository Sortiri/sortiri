import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { sanitizeEvalOutput } from "./evalLib";
import { suggestPlaybooksForGoal, docToPlaybook } from "./playbooksLib";
import type { RecommendationInput } from "./recommendationLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type EvalFailureCategory =
  | "command_failure"
  | "http_api_failure"
  | "source_webhook_failure"
  | "permission_failure"
  | "evidence_safety_failure"
  | "context_quality_failure"
  | "no_secret_leak_failure"
  | "other_failure";

export type FailureClassification = {
  category: EvalFailureCategory;
  type: Doc<"recommendations">["type"];
  priority: Doc<"recommendations">["priority"];
  reason: string;
};

const CRITICAL_KEYWORDS = [
  "stripe",
  "payment",
  "security",
  "audit",
  "permission",
  "secret",
  "webhook",
];

const SIGNIFICANT_STATUSES = new Set<Doc<"evalResults">["status"]>([
  "failed",
  "error",
  "needs_review",
]);

export function isSignificantFailure(status: Doc<"evalResults">["status"]): boolean {
  return SIGNIFICANT_STATUSES.has(status);
}

export function redactFailureOutput(output?: string, error?: string): {
  output?: string;
  error?: string;
} {
  return {
    output: sanitizeEvalOutput(output),
    error: sanitizeEvalOutput(error),
  };
}

export function buildRemediationDedupKey(evalResultId: Id<"evalResults">): string {
  return `eval-remediation:${evalResultId}`;
}

export function classifyEvalFailure(
  evalCase: Pick<Doc<"evalCases">, "type" | "title" | "required" | "config">,
  result: Pick<Doc<"evalResults">, "status" | "title" | "summary" | "output" | "error">,
): FailureClassification {
  const haystack = [
    evalCase.title,
    result.title,
    result.summary,
    result.output,
    result.error,
    JSON.stringify(evalCase.config ?? {}),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const isCriticalKeyword = CRITICAL_KEYWORDS.some((kw) => haystack.includes(kw));

  switch (evalCase.type) {
    case "command": {
      const priority: Doc<"recommendations">["priority"] = isCriticalKeyword
        ? "critical"
        : evalCase.required
          ? "high"
          : "normal";
      return {
        category: "command_failure",
        type: "fix",
        priority,
        reason: "A validation command in the private eval suite may have failed and may need attention.",
      };
    }
    case "http_api_check":
      return {
        category: "http_api_failure",
        type: "fix",
        priority: "high",
        reason: "An HTTP API check in the private eval suite may have failed.",
      };
    case "source_webhook_check": {
      const priority: Doc<"recommendations">["priority"] =
        haystack.includes("stripe") || haystack.includes("payment") ? "critical" : "high";
      return {
        category: "source_webhook_failure",
        type: "fix",
        priority,
        reason: "A source webhook validation check may have failed.",
      };
    }
    case "permission_check":
      return {
        category: "permission_failure",
        type: "security_review",
        priority: "critical",
        reason: "A permission check may have failed — access control regressions can expose workspace data.",
      };
    case "evidence_safety_check":
      return {
        category: "evidence_safety_failure",
        type: "audit_review",
        priority: "critical",
        reason: "An evidence safety check may have failed — audit and share safety is trust-critical.",
      };
    case "context_quality_check": {
      const priority: Doc<"recommendations">["priority"] = evalCase.required ? "high" : "normal";
      return {
        category: "context_quality_failure",
        type: "improve",
        priority,
        reason: "A context quality check may indicate the context pack needs improvement.",
      };
    }
    case "no_secret_leak_check":
      return {
        category: "no_secret_leak_failure",
        type: "security_review",
        priority: "critical",
        reason: "A no-secret-leak check may have detected a secret exposure risk.",
      };
    default:
      return {
        category: "other_failure",
        type: "fix",
        priority: evalCase.required ? "high" : "normal",
        reason: "A private eval case may have failed and may need remediation.",
      };
  }
}

export function buildRemediationTitle(
  classification: FailureClassification,
  evalCase: Pick<Doc<"evalCases">, "title" | "type">,
  suiteTitle?: string,
): string {
  const caseTitle = evalCase.title.trim();
  switch (classification.category) {
    case "command_failure":
      return `Fix failed validation command: ${caseTitle}`;
    case "http_api_failure":
      return `Fix API route failure: ${caseTitle}`;
    case "source_webhook_failure":
      return `Fix failed webhook eval: ${caseTitle}`;
    case "permission_failure":
      return "Fix access control regression from eval run";
    case "evidence_safety_failure":
      return "Fix evidence safety regression";
    case "context_quality_failure":
      return "Improve context pack quality from eval failure";
    case "no_secret_leak_failure":
      return "Fix secret leak risk from eval failure";
    default:
      return suiteTitle ? `Fix failed eval: ${suiteTitle}` : `Fix failed eval case: ${caseTitle}`;
  }
}

export function buildRemediationSummary(
  classification: FailureClassification,
  evalCase: Pick<Doc<"evalCases">, "title" | "type" | "required">,
  result: Pick<Doc<"evalResults">, "status" | "summary" | "output" | "error">,
  suiteTitle?: string,
): string {
  const redacted = redactFailureOutput(result.output, result.error);
  const parts = [
    `Private eval case "${evalCase.title}" (${evalCase.type}) finished with status ${result.status}.`,
    classification.reason,
    suiteTitle ? `Eval suite: ${suiteTitle}.` : undefined,
    evalCase.required ? "This case is required." : "This case is optional.",
    result.summary ? `Result summary: ${result.summary}` : undefined,
    redacted.error ? `Error (redacted): ${redacted.error.slice(0, 500)}` : undefined,
    redacted.output ? `Output (redacted): ${redacted.output.slice(0, 500)}` : undefined,
    "This recommendation was generated from a failed private eval and may need remediation.",
  ].filter(Boolean);
  return parts.join(" ");
}

export function buildValidationRequirementsForFailure(
  classification: FailureClassification,
  evalCase: Pick<Doc<"evalCases">, "title" | "type" | "config">,
): NonNullable<Doc<"recommendations">["validationRequirements"]> {
  const config = (evalCase.config ?? {}) as Record<string, unknown>;
  const requirements: NonNullable<Doc<"recommendations">["validationRequirements"]> = [];

  if (evalCase.type === "command" && typeof config.command === "string") {
    requirements.push({
      title: `Re-run failed command: ${evalCase.title}`,
      command: config.command,
      reason: "Verify the validation command passes after remediation.",
      required: true,
    });
  }

  if (evalCase.type === "http_api_check" && typeof config.path === "string") {
    requirements.push({
      title: `Re-run HTTP API check: ${evalCase.title}`,
      command: `curl -s -o /dev/null -w "%{http_code}" ${config.path}`,
      reason: "Verify the API route responds correctly after remediation.",
      required: true,
    });
  }

  if (evalCase.type === "source_webhook_check" && typeof config.script === "string") {
    requirements.push({
      title: `Re-run webhook validation: ${evalCase.title}`,
      command: config.script,
      reason: "Verify webhook validation passes after remediation.",
      required: true,
    });
  }

  if (classification.category === "permission_failure") {
    requirements.push({
      title: "Re-run permission checks",
      command: "npm run test:unit -- remediation-permissions",
      reason: "Verify access control is not regressed.",
      required: true,
    });
  }

  if (classification.category === "no_secret_leak_failure") {
    requirements.push({
      title: "Re-run secret leak checks",
      command: "npm run sanity:integration-secrets",
      reason: "Verify no secrets are exposed after remediation.",
      required: true,
    });
  }

  if (requirements.length === 0) {
    requirements.push({
      title: `Re-run eval case: ${evalCase.title}`,
      reason: "Re-run the private eval suite to verify the fix.",
      required: true,
    });
  }

  return requirements;
}

export async function suggestPlaybookForFailure(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  goal: string,
  suitePlaybookId?: Id<"playbooks">,
): Promise<Id<"playbooks"> | undefined> {
  if (suitePlaybookId) return suitePlaybookId;

  const playbooks = await ctx.db
    .query("playbooks")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const active = playbooks.filter((pb) => pb.status === "active");
  const matches = suggestPlaybooksForGoal(active.map(docToPlaybook), goal);
  return matches[0]?.id as Id<"playbooks"> | undefined;
}

export async function findOpenRemediationForResult(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  evalResultId: Id<"evalResults">,
): Promise<Doc<"recommendations"> | null> {
  const dedupKey = buildRemediationDedupKey(evalResultId);
  const doc = await ctx.db
    .query("recommendations")
    .withIndex("by_workspace_dedup_key", (q) =>
      q.eq("workspaceId", workspaceId).eq("dedupKey", dedupKey),
    )
    .first();
  if (!doc || doc.status === "dismissed" || doc.status === "archived") return null;
  return doc;
}

export type RemediationDraftInput = {
  run: Doc<"evalRuns">;
  suite: Doc<"evalSuites">;
  evalCase: Doc<"evalCases">;
  result: Doc<"evalResults">;
};

export async function buildRemediationDraft(
  ctx: DbReadCtx,
  input: RemediationDraftInput,
): Promise<RecommendationInput | null> {
  if (!isSignificantFailure(input.result.status)) return null;

  const existing = await findOpenRemediationForResult(
    ctx,
    input.run.workspaceId,
    input.result._id,
  );
  if (existing) return null;

  const classification = classifyEvalFailure(input.evalCase, input.result);
  const title = buildRemediationTitle(classification, input.evalCase, input.suite.title);
  const summary = buildRemediationSummary(
    classification,
    input.evalCase,
    input.result,
    input.suite.title,
  );
  const suggestedGoal = `Remediate failed eval case: ${input.evalCase.title}`;
  const suggestedWorkstreamTitle = buildRemediationTitle(
    classification,
    input.evalCase,
    input.suite.title,
  ).replace(/^Fix /, "Fix ");

  const recommendedPlaybookId = await suggestPlaybookForFailure(
    ctx,
    input.run.workspaceId,
    suggestedGoal,
    input.suite.playbookId,
  );

  const validationRequirements = buildValidationRequirementsForFailure(
    classification,
    input.evalCase,
  );

  const evidencePlaybookIds = recommendedPlaybookId ? [recommendedPlaybookId] : undefined;
  if (input.suite.lessonId) {
    // lesson evidence attached below
  }

  return {
    workspaceId: input.run.workspaceId,
    projectId: input.run.projectId ?? input.suite.projectId,
    workstreamId: input.run.workstreamId ?? input.suite.workstreamId,
    title,
    summary,
    type: classification.type,
    source: "eval_failure",
    priority: classification.priority,
    confidence: "likely",
    reason: classification.reason,
    suggestedGoal,
    suggestedWorkstreamTitle,
    recommendedPlaybookId,
    validationRequirements,
    evalSuiteId: input.suite._id,
    evalRunId: input.run._id,
    evalResultId: input.result._id,
    remediationStatus: "not_started",
    evidenceLessonIds: input.suite.lessonId ? [input.suite.lessonId] : undefined,
    evidencePlaybookIds,
    dedupKey: buildRemediationDedupKey(input.result._id),
  };
}

export async function buildRemediationDraftsFromEvalRun(
  ctx: DbReadCtx,
  evalRunId: Id<"evalRuns">,
): Promise<RemediationDraftInput[]> {
  const run = await ctx.db.get(evalRunId);
  if (!run) throw new Error("Eval run not found");

  const suite = await ctx.db.get(run.evalSuiteId);
  if (!suite) throw new Error("Eval suite not found");

  const results = await ctx.db
    .query("evalResults")
    .withIndex("by_run", (q) => q.eq("evalRunId", evalRunId))
    .collect();

  const inputs: RemediationDraftInput[] = [];
  for (const result of results) {
    if (!isSignificantFailure(result.status)) continue;
    const evalCase = await ctx.db.get(result.evalCaseId);
    if (!evalCase) continue;
    inputs.push({ run, suite, evalCase, result });
  }
  return inputs;
}

export async function updateRemediationStatusAfterRerun(
  ctx: DbWriteCtx,
  evalRunId: Id<"evalRuns">,
  runStatus: Doc<"evalRuns">["status"],
): Promise<Id<"recommendations">[]> {
  const allRecs = await ctx.db.query("recommendations").collect();
  const updatedIds: Id<"recommendations">[] = [];

  for (const rec of allRecs) {
    if (rec.remediationEvalRunId !== evalRunId) continue;
    const newStatus =
      runStatus === "passed"
        ? ("eval_rerun_passed" as const)
        : ("eval_rerun_failed" as const);
    await ctx.db.patch(rec._id, {
      remediationStatus: newStatus,
      updatedAt: Date.now(),
    });
    updatedIds.push(rec._id);
  }

  return updatedIds;
}
