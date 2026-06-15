import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  assertNotAuditorWorkspaceBrowse,
  canViewEvent,
  canViewWorkstream,
  canWriteWorkspaceData,
  getMembershipAndAccessible,
} from "./authz";
import { isArtifactSafeForAudit, isEventSafeForAudit } from "./sensitiveContent";
import type { AccessibleProjects } from "./projectAccessLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type EvalSuiteInput = {
  workspaceId: Id<"workspaces">;
  projectId?: Id<"projects">;
  workstreamId?: Id<"workstreams">;
  recommendationId?: Id<"recommendations">;
  contextPackId?: Id<"contextPacks">;
  playbookId?: Id<"playbooks">;
  lessonId?: Id<"lessons">;
  title: string;
  summary: string;
  source: Doc<"evalSuites">["source"];
  status?: Doc<"evalSuites">["status"];
  priority: Doc<"evalSuites">["priority"];
  tags?: string[];
  dedupKey?: string;
  createdBy?: Doc<"evalSuites">["createdBy"];
};

export type EvalCaseInput = {
  workspaceId: Id<"workspaces">;
  evalSuiteId: Id<"evalSuites">;
  title: string;
  description?: string;
  type: Doc<"evalCases">["type"];
  required: boolean;
  config: unknown;
  expected?: unknown;
  order?: number;
};

export type EvalSuiteRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  recommendationId?: string;
  contextPackId?: string;
  playbookId?: string;
  lessonId?: string;
  title: string;
  summary: string;
  source: Doc<"evalSuites">["source"];
  status: Doc<"evalSuites">["status"];
  priority: Doc<"evalSuites">["priority"];
  tags?: string[];
  dedupKey?: string;
  createdBy?: Doc<"evalSuites">["createdBy"];
  createdAt: number;
  updatedAt: number;
};

export type EvalCaseRecord = {
  id: string;
  workspaceId: string;
  evalSuiteId: string;
  title: string;
  description?: string;
  type: Doc<"evalCases">["type"];
  required: boolean;
  config: Record<string, unknown>;
  expected?: Record<string, unknown>;
  order?: number;
  createdAt: number;
  updatedAt: number;
};

export type EvalRunRecord = {
  id: string;
  workspaceId: string;
  evalSuiteId: string;
  projectId?: string;
  workstreamId?: string;
  recommendationId?: string;
  contextPackId?: string;
  status: Doc<"evalRuns">["status"];
  summary?: string;
  startedAt?: number;
  completedAt?: number;
  createdBy?: Doc<"evalRuns">["createdBy"];
  createdAt: number;
  updatedAt: number;
};

export type EvalResultRecord = {
  id: string;
  workspaceId: string;
  evalRunId: string;
  evalCaseId: string;
  status: Doc<"evalResults">["status"];
  title: string;
  summary?: string;
  output?: string;
  error?: string;
  evidenceEventIds?: string[];
  evidenceArtifactIds?: string[];
  evidenceWorkstreamIds?: string[];
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function docToEvalSuite(doc: Doc<"evalSuites">): EvalSuiteRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    workstreamId: doc.workstreamId,
    recommendationId: doc.recommendationId,
    contextPackId: doc.contextPackId,
    playbookId: doc.playbookId,
    lessonId: doc.lessonId,
    title: doc.title,
    summary: doc.summary,
    source: doc.source,
    status: doc.status,
    priority: doc.priority,
    tags: doc.tags,
    dedupKey: doc.dedupKey,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function docToEvalCase(doc: Doc<"evalCases">): EvalCaseRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    evalSuiteId: doc.evalSuiteId,
    title: doc.title,
    description: doc.description,
    type: doc.type,
    required: doc.required,
    config: asRecord(doc.config),
    expected: doc.expected ? asRecord(doc.expected) : undefined,
    order: doc.order,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function docToEvalRun(doc: Doc<"evalRuns">): EvalRunRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    evalSuiteId: doc.evalSuiteId,
    projectId: doc.projectId,
    workstreamId: doc.workstreamId,
    recommendationId: doc.recommendationId,
    contextPackId: doc.contextPackId,
    status: doc.status,
    summary: doc.summary,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function docToEvalResult(doc: Doc<"evalResults">): EvalResultRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    evalRunId: doc.evalRunId,
    evalCaseId: doc.evalCaseId,
    status: doc.status,
    title: doc.title,
    summary: doc.summary,
    output: doc.output,
    error: doc.error,
    evidenceEventIds: doc.evidenceEventIds,
    evidenceArtifactIds: doc.evidenceArtifactIds,
    evidenceWorkstreamIds: doc.evidenceWorkstreamIds,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    createdAt: doc.createdAt,
  };
}

export async function createEvalSuiteDoc(
  ctx: DbWriteCtx,
  input: EvalSuiteInput,
): Promise<Id<"evalSuites">> {
  const now = Date.now();
  return ctx.db.insert("evalSuites", {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    recommendationId: input.recommendationId,
    contextPackId: input.contextPackId,
    playbookId: input.playbookId,
    lessonId: input.lessonId,
    title: input.title,
    summary: input.summary,
    source: input.source,
    status: input.status ?? "active",
    priority: input.priority,
    tags: input.tags,
    dedupKey: input.dedupKey,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function createEvalCaseDoc(
  ctx: DbWriteCtx,
  input: EvalCaseInput,
): Promise<Id<"evalCases">> {
  const now = Date.now();
  return ctx.db.insert("evalCases", {
    workspaceId: input.workspaceId,
    evalSuiteId: input.evalSuiteId,
    title: input.title,
    description: input.description,
    type: input.type,
    required: input.required,
    config: input.config,
    expected: input.expected,
    order: input.order,
    createdAt: now,
    updatedAt: now,
  });
}

export async function patchEvalSuiteDoc(
  ctx: DbWriteCtx,
  suiteId: Id<"evalSuites">,
  patch: Partial<Pick<Doc<"evalSuites">, "status" | "title" | "summary" | "priority" | "tags">>,
): Promise<void> {
  await ctx.db.patch(suiteId, { ...patch, updatedAt: Date.now() });
}

export async function findActiveEvalSuiteByDedupKey(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  dedupKey: string,
): Promise<Doc<"evalSuites"> | null> {
  const doc = await ctx.db
    .query("evalSuites")
    .withIndex("by_workspace_dedup_key", (q) =>
      q.eq("workspaceId", workspaceId).eq("dedupKey", dedupKey),
    )
    .first();
  if (!doc || doc.status === "archived") return null;
  return doc;
}

export async function listEvalSuitesForWorkspace(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  options?: {
    status?: Doc<"evalSuites">["status"] | "all";
    source?: Doc<"evalSuites">["source"] | "all";
    projectId?: Id<"projects">;
    accessible?: AccessibleProjects;
    limit?: number;
  },
): Promise<EvalSuiteRecord[]> {
  const query = ctx.db
    .query("evalSuites")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .order("desc");

  const docs = await query.collect();
  let filtered = docs;

  if (options?.status && options.status !== "all") {
    filtered = filtered.filter((doc) => doc.status === options.status);
  }
  if (options?.source && options.source !== "all") {
    filtered = filtered.filter((doc) => doc.source === options.source);
  }
  if (options?.projectId) {
    filtered = filtered.filter((doc) => doc.projectId === options.projectId);
  }
  const accessible = options?.accessible;
  if (accessible && accessible !== "all") {
    filtered = filtered.filter(
      (doc) => !doc.projectId || accessible.has(doc.projectId),
    );
  }

  return filtered
    .slice(0, options?.limit ?? 100)
    .map(docToEvalSuite);
}

export async function listEvalCasesForSuite(
  ctx: DbReadCtx,
  evalSuiteId: Id<"evalSuites">,
): Promise<EvalCaseRecord[]> {
  const docs = await ctx.db
    .query("evalCases")
    .withIndex("by_suite", (q) => q.eq("evalSuiteId", evalSuiteId))
    .collect();
  return docs
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(docToEvalCase);
}

export async function listEvalRunsForSuite(
  ctx: DbReadCtx,
  evalSuiteId: Id<"evalSuites">,
  limit = 20,
): Promise<EvalRunRecord[]> {
  const docs = await ctx.db
    .query("evalRuns")
    .withIndex("by_suite", (q) => q.eq("evalSuiteId", evalSuiteId))
    .order("desc")
    .take(limit);
  return docs.map(docToEvalRun);
}

export async function listEvalRunsForWorkstream(
  ctx: DbReadCtx,
  workstreamId: Id<"workstreams">,
  limit = 20,
): Promise<EvalRunRecord[]> {
  const docs = await ctx.db
    .query("evalRuns")
    .withIndex("by_workstream", (q) => q.eq("workstreamId", workstreamId))
    .order("desc")
    .take(limit);
  return docs.map(docToEvalRun);
}

export async function listEvalResultsForRun(
  ctx: DbReadCtx,
  evalRunId: Id<"evalRuns">,
): Promise<EvalResultRecord[]> {
  const docs = await ctx.db
    .query("evalResults")
    .withIndex("by_run", (q) => q.eq("evalRunId", evalRunId))
    .collect();
  return docs.map(docToEvalResult);
}

export async function assertEvalSuiteAccess(
  ctx: Parameters<typeof getMembershipAndAccessible>[0],
  evalSuiteId: Id<"evalSuites">,
  clerkUserId: string,
  options?: { requireWrite?: boolean; requireRun?: boolean },
) {
  const doc = await ctx.db.get(evalSuiteId);
  if (!doc) throw new Error("Eval suite not found");

  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    doc.workspaceId,
    clerkUserId,
  );
  assertNotAuditorWorkspaceBrowse(membership);

  if (doc.projectId && accessible !== "all" && !accessible.has(doc.projectId)) {
    throw new Error("Access denied");
  }

  if (options?.requireWrite && !canWriteWorkspaceData(membership.role)) {
    throw new Error("Access denied");
  }

  if (options?.requireRun && !canWriteWorkspaceData(membership.role)) {
    throw new Error("Access denied: viewers cannot run evals");
  }

  return { doc, membership, accessible };
}

export async function assertEvalRunAccess(
  ctx: Parameters<typeof getMembershipAndAccessible>[0],
  evalRunId: Id<"evalRuns">,
  clerkUserId: string,
  options?: { requireWrite?: boolean },
) {
  const doc = await ctx.db.get(evalRunId);
  if (!doc) throw new Error("Eval run not found");

  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    doc.workspaceId,
    clerkUserId,
  );
  assertNotAuditorWorkspaceBrowse(membership);

  if (doc.projectId && accessible !== "all" && !accessible.has(doc.projectId)) {
    throw new Error("Access denied");
  }

  if (options?.requireWrite && !canWriteWorkspaceData(membership.role)) {
    throw new Error("Access denied");
  }

  return { doc, membership, accessible };
}

export async function filterEvalResultEvidence(
  ctx: DbReadCtx,
  result: EvalResultRecord,
  accessible: AccessibleProjects,
): Promise<EvalResultRecord> {
  const filtered = { ...result };

  if (filtered.evidenceEventIds?.length) {
    const ids: string[] = [];
    for (const eventId of filtered.evidenceEventIds) {
      const event = await ctx.db.get(eventId as Id<"events">);
      if (event && canViewEvent(event, accessible) && isEventSafeForAudit(event)) {
        ids.push(eventId);
      }
    }
    filtered.evidenceEventIds = ids;
  }

  if (filtered.evidenceWorkstreamIds?.length) {
    const ids: string[] = [];
    for (const wsId of filtered.evidenceWorkstreamIds) {
      const ws = await ctx.db.get(wsId as Id<"workstreams">);
      if (ws && canViewWorkstream(ws, accessible)) ids.push(wsId);
    }
    filtered.evidenceWorkstreamIds = ids;
  }

  if (filtered.evidenceArtifactIds?.length) {
    const ids: string[] = [];
    for (const artifactId of filtered.evidenceArtifactIds) {
      const artifact = await ctx.db.get(artifactId as Id<"artifacts">);
      if (artifact && isArtifactSafeForAudit(artifact)) ids.push(artifactId);
    }
    filtered.evidenceArtifactIds = ids;
  }

  return filtered;
}

export async function filterEvalResultsEvidence(
  ctx: DbReadCtx,
  results: EvalResultRecord[],
  accessible: AccessibleProjects,
): Promise<EvalResultRecord[]> {
  return Promise.all(results.map((result) => filterEvalResultEvidence(ctx, result, accessible)));
}

export function sanitizeEvalOutput(output?: string): string | undefined {
  if (!output) return output;
  const secretPatterns = [
    /sk-[a-zA-Z0-9]{10,}/g,
    /Bearer\s+[a-zA-Z0-9._-]{10,}/gi,
    /api[_-]?key["\s:=]+[a-zA-Z0-9._-]{8,}/gi,
    /password["\s:=]+[^\s"']{4,}/gi,
  ];
  let sanitized = output;
  for (const pattern of secretPatterns) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  if (sanitized.length > 8000) {
    sanitized = `${sanitized.slice(0, 8000)}\n...[truncated]`;
  }
  return sanitized;
}

export async function insertDraftEvalSuite(
  ctx: DbWriteCtx,
  draft: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    recommendationId?: Id<"recommendations">;
    contextPackId?: Id<"contextPacks">;
    playbookId?: Id<"playbooks">;
    lessonId?: Id<"lessons">;
    title: string;
    summary: string;
    source: Doc<"evalSuites">["source"];
    priority: Doc<"evalSuites">["priority"];
    tags?: string[];
    dedupKey: string;
    createdBy?: Doc<"evalSuites">["createdBy"];
    cases: Array<Omit<EvalCaseInput, "workspaceId" | "evalSuiteId">>;
  },
): Promise<{ suiteId: Id<"evalSuites">; created: boolean }> {
  const existing = await findActiveEvalSuiteByDedupKey(ctx, draft.workspaceId, draft.dedupKey);
  if (existing) {
    return { suiteId: existing._id, created: false };
  }

  const suiteId = await createEvalSuiteDoc(ctx, {
    workspaceId: draft.workspaceId,
    projectId: draft.projectId,
    workstreamId: draft.workstreamId,
    recommendationId: draft.recommendationId,
    contextPackId: draft.contextPackId,
    playbookId: draft.playbookId,
    lessonId: draft.lessonId,
    title: draft.title,
    summary: draft.summary,
    source: draft.source,
    status: "active",
    priority: draft.priority,
    tags: draft.tags,
    dedupKey: draft.dedupKey,
    createdBy: draft.createdBy,
  });

  for (const evalCase of draft.cases) {
    await createEvalCaseDoc(ctx, {
      workspaceId: draft.workspaceId,
      evalSuiteId: suiteId,
      title: evalCase.title,
      description: evalCase.description,
      type: evalCase.type,
      required: evalCase.required,
      config: evalCase.config,
      expected: evalCase.expected,
      order: evalCase.order,
    });
  }

  return { suiteId, created: true };
}
