import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { resolveIngestWorkspace } from "./lib/ingestAuth";
import {
  assertNotAuditorWorkspaceBrowse,
  canWriteWorkspaceData,
  getMembershipAndAccessible,
} from "./lib/authz";
import {
  docToEvalSuite,
  filterEvalResultsEvidence,
  insertDraftEvalSuite,
  listEvalCasesForSuite,
  listEvalResultsForRun,
  listEvalRunsForSuite,
  listEvalSuitesForWorkspace,
  patchEvalSuiteDoc,
} from "./lib/evalLib";
import {
  loadContextPackDraft,
  loadLessonDraft,
  loadPlaybookDraft,
  loadRecommendationDraft,
  generateFromKnownFailure as buildKnownFailureDraft,
} from "./lib/evalGeneration";
import {
  createEvalRunDoc,
  finalizeEvalRun,
  markEvalRunRunning,
  recordEvalCaseResult,
  recordEvalRunStartedEvent,
  recordEvalSuiteGeneratedEvent,
} from "./lib/evalRunnerLib";
import { evalResultStatusValidator } from "./lib/validators";

const ingestAuthArgs = {
  ingestKey: v.optional(v.string()),
  apiKeyId: v.optional(v.id("apiKeys")),
  workspaceId: v.string(),
};

async function resolveIngestActor(
  ctx: Parameters<typeof getMembershipAndAccessible>[0],
  workspaceId: Id<"workspaces">,
  apiKeyId?: Id<"apiKeys">,
) {
  if (apiKeyId) {
    const apiKey = await ctx.db.get(apiKeyId);
    if (apiKey?.createdBy) {
      return {
        clerkUserId: apiKey.createdBy.userId ?? "api-key-agent",
        name: apiKey.createdBy.name ?? "Cursor Agent",
        email: apiKey.createdBy.email,
        createdBy: {
          clerkUserId: apiKey.createdBy.userId,
          email: apiKey.createdBy.email,
          name: apiKey.createdBy.name ?? "Cursor Agent",
          source: "mcp",
        },
      };
    }
  }
  const workspace = await ctx.db.get(workspaceId);
  return {
    clerkUserId: workspace?.userId ?? "api-key-agent",
    name: "Cursor Agent",
    email: undefined as string | undefined,
    createdBy: {
      clerkUserId: workspace?.userId,
      name: "Cursor Agent",
      source: "mcp",
    },
  };
}

async function assertIngestWrite(
  ctx: Parameters<typeof getMembershipAndAccessible>[0],
  workspaceId: Id<"workspaces">,
  apiKeyId?: Id<"apiKeys">,
) {
  const actor = await resolveIngestActor(ctx, workspaceId, apiKeyId);
  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    workspaceId,
    actor.clerkUserId,
  );
  assertNotAuditorWorkspaceBrowse(membership);
  if (!canWriteWorkspaceData(membership.role)) {
    throw new Error("Access denied");
  }
  return { actor, membership, accessible };
}

async function generateSuiteIngest(
  ctx: Parameters<typeof insertDraftEvalSuite>[0],
  workspaceId: Id<"workspaces">,
  draft: Awaited<ReturnType<typeof loadPlaybookDraft>>,
  actor: Awaited<ReturnType<typeof resolveIngestActor>>,
) {
  const { suiteId, created } = await insertDraftEvalSuite(ctx, {
    ...draft,
    createdBy: actor.createdBy,
  });

  if (created) {
    await recordEvalSuiteGeneratedEvent(ctx, {
      workspaceId,
      evalSuiteId: suiteId,
      title: draft.title,
      summary: draft.summary,
      priority: draft.priority,
      actor: { type: "agent", name: actor.name, email: actor.email, id: actor.clerkUserId },
    });
  }

  return { suiteId, created };
}

export const listSuites = query({
  args: {
    ...ingestAuthArgs,
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const actor = await resolveIngestActor(ctx, workspace._id, args.apiKeyId);
    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      actor.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);

    return listEvalSuitesForWorkspace(ctx, workspace._id, {
      status: (args.status as "active" | "draft" | "archived" | "all") ?? "active",
      accessible,
      limit: args.limit ?? 50,
    });
  },
});

export const getSuite = query({
  args: {
    ...ingestAuthArgs,
    evalSuiteId: v.id("evalSuites"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const actor = await resolveIngestActor(ctx, workspace._id, args.apiKeyId);
    const { membership } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      actor.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);

    const doc = await ctx.db.get(args.evalSuiteId);
    if (!doc || doc.workspaceId !== workspace._id) {
      throw new Error("Eval suite not found");
    }

    const cases = await listEvalCasesForSuite(ctx, args.evalSuiteId);
    const runs = await listEvalRunsForSuite(ctx, args.evalSuiteId, 5);
    return {
      suite: docToEvalSuite(doc),
      cases,
      recentRuns: runs,
    };
  },
});

export const generateFromPlaybook = mutation({
  args: { ...ingestAuthArgs, playbookId: v.id("playbooks") },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const { actor } = await assertIngestWrite(ctx, workspace._id, args.apiKeyId);
    const draft = await loadPlaybookDraft(ctx, args.playbookId);
    if (draft.workspaceId !== workspace._id) throw new Error("Playbook not found");
    return generateSuiteIngest(ctx, workspace._id, draft, actor);
  },
});

export const generateFromLesson = mutation({
  args: { ...ingestAuthArgs, lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const { actor } = await assertIngestWrite(ctx, workspace._id, args.apiKeyId);
    const draft = await loadLessonDraft(ctx, args.lessonId);
    if (draft.workspaceId !== workspace._id) throw new Error("Lesson not found");
    return generateSuiteIngest(ctx, workspace._id, draft, actor);
  },
});

export const generateFromRecommendation = mutation({
  args: { ...ingestAuthArgs, recommendationId: v.id("recommendations") },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const { actor } = await assertIngestWrite(ctx, workspace._id, args.apiKeyId);
    const draft = await loadRecommendationDraft(ctx, args.recommendationId);
    if (draft.workspaceId !== workspace._id) throw new Error("Recommendation not found");
    return generateSuiteIngest(ctx, workspace._id, draft, actor);
  },
});

export const generateFromContextPack = mutation({
  args: { ...ingestAuthArgs, contextPackId: v.id("contextPacks") },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const { actor } = await assertIngestWrite(ctx, workspace._id, args.apiKeyId);
    const draft = await loadContextPackDraft(ctx, args.contextPackId);
    if (draft.workspaceId !== workspace._id) throw new Error("Context pack not found");
    return generateSuiteIngest(ctx, workspace._id, draft, actor);
  },
});

export const generateFromKnownFailure = mutation({
  args: {
    ...ingestAuthArgs,
    failureType: v.string(),
    title: v.string(),
    summary: v.string(),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    recommendedValidation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const { actor } = await assertIngestWrite(ctx, workspace._id, args.apiKeyId);
    const draft = buildKnownFailureDraft({
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      failureType: args.failureType,
      title: args.title,
      summary: args.summary,
      recommendedValidation: args.recommendedValidation,
    });
    return generateSuiteIngest(ctx, workspace._id, draft, actor);
  },
});

export const runSuite = mutation({
  args: {
    ...ingestAuthArgs,
    evalSuiteId: v.id("evalSuites"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const { actor } = await assertIngestWrite(ctx, workspace._id, args.apiKeyId);

    const doc = await ctx.db.get(args.evalSuiteId);
    if (!doc || doc.workspaceId !== workspace._id) {
      throw new Error("Eval suite not found");
    }

    const runId = await createEvalRunDoc(ctx, {
      workspaceId: workspace._id,
      evalSuiteId: doc._id,
      projectId: doc.projectId,
      workstreamId: doc.workstreamId,
      recommendationId: doc.recommendationId,
      contextPackId: doc.contextPackId,
      createdBy: actor.createdBy,
    });

    await recordEvalRunStartedEvent(ctx, {
      workspaceId: workspace._id,
      evalRunId: runId,
      suiteTitle: doc.title,
      actor: { type: "agent", name: actor.name, email: actor.email, id: actor.clerkUserId },
    });

    const cases = await listEvalCasesForSuite(ctx, args.evalSuiteId);
    return { runId, cases };
  },
});

export const markRunning = mutation({
  args: {
    ...ingestAuthArgs,
    evalRunId: v.id("evalRuns"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    await assertIngestWrite(ctx, workspace._id, args.apiKeyId);

    const run = await ctx.db.get(args.evalRunId);
    if (!run || run.workspaceId !== workspace._id) {
      throw new Error("Eval run not found");
    }

    await markEvalRunRunning(ctx, args.evalRunId);
    return { ok: true };
  },
});

export const getRun = query({
  args: {
    ...ingestAuthArgs,
    evalRunId: v.id("evalRuns"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const actor = await resolveIngestActor(ctx, workspace._id, args.apiKeyId);
    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      actor.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);

    const run = await ctx.db.get(args.evalRunId);
    if (!run || run.workspaceId !== workspace._id) {
      throw new Error("Eval run not found");
    }

    const results = await filterEvalResultsEvidence(
      ctx,
      await listEvalResultsForRun(ctx, args.evalRunId),
      accessible,
    );
    const suite = await ctx.db.get(run.evalSuiteId);
    return {
      run,
      suite: suite ? docToEvalSuite(suite) : null,
      results,
    };
  },
});

export const listResults = query({
  args: {
    ...ingestAuthArgs,
    evalRunId: v.id("evalRuns"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const actor = await resolveIngestActor(ctx, workspace._id, args.apiKeyId);
    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      actor.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);

    const run = await ctx.db.get(args.evalRunId);
    if (!run || run.workspaceId !== workspace._id) {
      throw new Error("Eval run not found");
    }

    return filterEvalResultsEvidence(
      ctx,
      await listEvalResultsForRun(ctx, args.evalRunId),
      accessible,
    );
  },
});

export const recordCaseResult = mutation({
  args: {
    ...ingestAuthArgs,
    evalRunId: v.id("evalRuns"),
    evalCaseId: v.id("evalCases"),
    status: evalResultStatusValidator,
    title: v.string(),
    summary: v.optional(v.string()),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
    evidenceEventIds: v.optional(v.array(v.id("events"))),
    evidenceArtifactIds: v.optional(v.array(v.id("artifacts"))),
    evidenceWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    await assertIngestWrite(ctx, workspace._id, args.apiKeyId);

    const run = await ctx.db.get(args.evalRunId);
    if (!run || run.workspaceId !== workspace._id) {
      throw new Error("Eval run not found");
    }

    const resultId = await recordEvalCaseResult(ctx, {
      workspaceId: workspace._id,
      evalRunId: args.evalRunId,
      result: {
        evalCaseId: args.evalCaseId,
        status: args.status,
        title: args.title,
        summary: args.summary,
        output: args.output,
        error: args.error,
        evidenceEventIds: args.evidenceEventIds,
        evidenceArtifactIds: args.evidenceArtifactIds,
        evidenceWorkstreamIds: args.evidenceWorkstreamIds,
        startedAt: args.startedAt,
        completedAt: args.completedAt,
      },
    });

    return { resultId };
  },
});

export const finalizeRun = mutation({
  args: {
    ...ingestAuthArgs,
    evalRunId: v.id("evalRuns"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const { actor } = await assertIngestWrite(ctx, workspace._id, args.apiKeyId);

    const run = await ctx.db.get(args.evalRunId);
    if (!run || run.workspaceId !== workspace._id) {
      throw new Error("Eval run not found");
    }

    const finalized = await finalizeEvalRun(ctx, args.evalRunId, {
      actor: { type: "agent", name: actor.name, email: actor.email, id: actor.clerkUserId },
    });
    const results = await listEvalResultsForRun(ctx, args.evalRunId);
    return { run: finalized, results };
  },
});

export const recommendForWorkstream = query({
  args: {
    ...ingestAuthArgs,
    workstreamId: v.id("workstreams"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const actor = await resolveIngestActor(ctx, workspace._id, args.apiKeyId);
    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      actor.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);

    const ws = await ctx.db.get(args.workstreamId);
    if (!ws || ws.workspaceId !== workspace._id) {
      throw new Error("Workstream not found");
    }

    const allSuites = await listEvalSuitesForWorkspace(ctx, workspace._id, {
      status: "active",
      accessible,
      limit: 100,
    });

    const linked = allSuites.filter(
      (suite) =>
        suite.workstreamId === args.workstreamId ||
        (ws.projectId && suite.projectId === ws.projectId),
    );

    const recommendations = await ctx.db
      .query("recommendations")
      .withIndex("by_workstream", (q) => q.eq("workstreamId", args.workstreamId))
      .collect();

    for (const rec of recommendations) {
      const suite = allSuites.find((s) => s.recommendationId === rec._id);
      if (suite && !linked.some((l) => l.id === suite.id)) linked.push(suite);
    }

    return linked.slice(0, 10);
  },
});

export const archiveSuite = mutation({
  args: {
    ...ingestAuthArgs,
    evalSuiteId: v.id("evalSuites"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    await assertIngestWrite(ctx, workspace._id, args.apiKeyId);

    const doc = await ctx.db.get(args.evalSuiteId);
    if (!doc || doc.workspaceId !== workspace._id) {
      throw new Error("Eval suite not found");
    }

    await patchEvalSuiteDoc(ctx, args.evalSuiteId, { status: "archived" });
    return { ok: true };
  },
});
