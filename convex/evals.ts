import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  assertNotAuditorWorkspaceBrowse,
  canWriteWorkspaceData,
  getCurrentUser,
  getMembershipAndAccessible,
} from "./lib/authz";
import { assertWorkspaceBrowseAccess, insertEvent } from "./lib/eventsLib";
import {
  assertEvalRunAccess,
  assertEvalSuiteAccess,
  docToEvalCase,
  docToEvalResult,
  docToEvalRun,
  docToEvalSuite,
  filterEvalResultsEvidence,
  insertDraftEvalSuite,
  listEvalCasesForSuite,
  listEvalResultsForRun,
  listEvalRunsForSuite,
  listEvalRunsForWorkstream,
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
  recordEvalCaseResult,
  recordEvalRunStartedEvent,
  recordEvalSuiteGeneratedEvent,
  type CaseResultInput,
} from "./lib/evalRunnerLib";
import {
  evalCaseTypeValidator,
  evalResultStatusValidator,
  evalSuitePriorityValidator,
  evalSuiteSourceValidator,
  evalSuiteStatusValidator,
} from "./lib/validators";

function actorFromUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return {
    type: "human" as const,
    id: user.clerkUserId,
    name: user.name,
    email: user.email,
  };
}

function createdByFromUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return {
    clerkUserId: user.clerkUserId,
    email: user.email,
    name: user.name,
    source: "ui",
  };
}

async function generateAndRecordSuite(
  ctx: Parameters<typeof insertDraftEvalSuite>[0],
  draft: Awaited<ReturnType<typeof loadPlaybookDraft>>,
  user: Awaited<ReturnType<typeof getCurrentUser>>,
) {
  const { suiteId, created } = await insertDraftEvalSuite(ctx, {
    ...draft,
    createdBy: createdByFromUser(user),
  });

  if (created) {
    await recordEvalSuiteGeneratedEvent(ctx, {
      workspaceId: draft.workspaceId,
      evalSuiteId: suiteId,
      title: draft.title,
      summary: draft.summary,
      priority: draft.priority,
      actor: actorFromUser(user),
    });
  }

  return { suiteId, created };
}

export const generateFromPlaybook = mutation({
  args: { playbookId: v.id("playbooks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const draft = await loadPlaybookDraft(ctx, args.playbookId);
    const { membership } = await getMembershipAndAccessible(
      ctx,
      draft.workspaceId,
      user.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");
    return generateAndRecordSuite(ctx, draft, user);
  },
});

export const generateFromLesson = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const draft = await loadLessonDraft(ctx, args.lessonId);
    const { membership } = await getMembershipAndAccessible(
      ctx,
      draft.workspaceId,
      user.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");
    return generateAndRecordSuite(ctx, draft, user);
  },
});

export const generateFromRecommendation = mutation({
  args: { recommendationId: v.id("recommendations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const draft = await loadRecommendationDraft(ctx, args.recommendationId);
    const { membership } = await getMembershipAndAccessible(
      ctx,
      draft.workspaceId,
      user.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");
    return generateAndRecordSuite(ctx, draft, user);
  },
});

export const generateFromContextPack = mutation({
  args: { contextPackId: v.id("contextPacks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const draft = await loadContextPackDraft(ctx, args.contextPackId);
    const { membership } = await getMembershipAndAccessible(
      ctx,
      draft.workspaceId,
      user.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");
    return generateAndRecordSuite(ctx, draft, user);
  },
});

export const generateFromKnownFailure = mutation({
  args: {
    workspaceId: v.string(),
    failureType: v.string(),
    title: v.string(),
    summary: v.string(),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    recommendedValidation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      user.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");

    if (args.projectId && accessible !== "all" && !accessible.has(args.projectId)) {
      throw new Error("Access denied");
    }

    const draft = buildKnownFailureDraft({
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      failureType: args.failureType,
      title: args.title,
      summary: args.summary,
      recommendedValidation: args.recommendedValidation,
    });

    return generateAndRecordSuite(ctx, draft, user);
  },
});

export const listSuites = query({
  args: {
    workspaceId: v.string(),
    status: v.optional(evalSuiteStatusValidator),
    source: v.optional(evalSuiteSourceValidator),
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      user.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);

    return listEvalSuitesForWorkspace(ctx, workspace._id, {
      status: args.status ?? "all",
      source: args.source ?? "all",
      projectId: args.projectId,
      accessible,
      limit: args.limit,
    });
  },
});

export const getSuite = query({
  args: { evalSuiteId: v.id("evalSuites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { doc } = await assertEvalSuiteAccess(ctx, args.evalSuiteId, user.clerkUserId);
    const cases = await listEvalCasesForSuite(ctx, args.evalSuiteId);
    const runs = await listEvalRunsForSuite(ctx, args.evalSuiteId, 5);
    return {
      suite: docToEvalSuite(doc),
      cases,
      recentRuns: runs,
    };
  },
});

export const listCases = query({
  args: { evalSuiteId: v.id("evalSuites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertEvalSuiteAccess(ctx, args.evalSuiteId, user.clerkUserId);
    return listEvalCasesForSuite(ctx, args.evalSuiteId);
  },
});

export const runSuite = mutation({
  args: { evalSuiteId: v.id("evalSuites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { doc } = await assertEvalSuiteAccess(ctx, args.evalSuiteId, user.clerkUserId, {
      requireRun: true,
    });

    const runId = await createEvalRunDoc(ctx, {
      workspaceId: doc.workspaceId,
      evalSuiteId: doc._id,
      projectId: doc.projectId,
      workstreamId: doc.workstreamId,
      recommendationId: doc.recommendationId,
      contextPackId: doc.contextPackId,
      createdBy: createdByFromUser(user),
    });

    await recordEvalRunStartedEvent(ctx, {
      workspaceId: doc.workspaceId,
      evalRunId: runId,
      suiteTitle: doc.title,
      actor: actorFromUser(user),
    });

    return { runId };
  },
});

export const getRun = query({
  args: { evalRunId: v.id("evalRuns") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { doc, accessible } = await assertEvalRunAccess(ctx, args.evalRunId, user.clerkUserId);
    const results = await filterEvalResultsEvidence(
      ctx,
      await listEvalResultsForRun(ctx, args.evalRunId),
      accessible,
    );
    const suite = await ctx.db.get(doc.evalSuiteId);
    return {
      run: docToEvalRun(doc),
      suite: suite ? docToEvalSuite(suite) : null,
      results,
    };
  },
});

export const listRuns = query({
  args: { evalSuiteId: v.id("evalSuites"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertEvalSuiteAccess(ctx, args.evalSuiteId, user.clerkUserId);
    return listEvalRunsForSuite(ctx, args.evalSuiteId, args.limit ?? 20);
  },
});

export const listRunsForWorkstream = query({
  args: { workstreamId: v.id("workstreams"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const ws = await ctx.db.get(args.workstreamId);
    if (!ws) throw new Error("Workstream not found");
    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      ws.workspaceId,
      user.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);
    if (ws.projectId && accessible !== "all" && !accessible.has(ws.projectId)) {
      throw new Error("Access denied");
    }
    return listEvalRunsForWorkstream(ctx, args.workstreamId, args.limit ?? 20);
  },
});

export const listResults = query({
  args: { evalRunId: v.id("evalRuns") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { accessible } = await assertEvalRunAccess(ctx, args.evalRunId, user.clerkUserId);
    return filterEvalResultsEvidence(
      ctx,
      await listEvalResultsForRun(ctx, args.evalRunId),
      accessible,
    );
  },
});

export const archiveSuite = mutation({
  args: { evalSuiteId: v.id("evalSuites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { doc } = await assertEvalSuiteAccess(ctx, args.evalSuiteId, user.clerkUserId, {
      requireWrite: true,
    });
    await patchEvalSuiteDoc(ctx, args.evalSuiteId, { status: "archived" });
    await insertEvent(ctx, {
      workspaceId: doc.workspaceId,
      source: "system",
      category: "system_event",
      type: "eval_suite.archived",
      actor: actorFromUser(user),
      title: `Eval suite archived: ${doc.title}`,
      entity: { type: "other", id: args.evalSuiteId, name: doc.title },
      visibility: "primary",
      importance: "normal",
      occurredAt: Date.now(),
    });
    return { ok: true };
  },
});

export const activateSuite = mutation({
  args: { evalSuiteId: v.id("evalSuites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertEvalSuiteAccess(ctx, args.evalSuiteId, user.clerkUserId, { requireWrite: true });
    await patchEvalSuiteDoc(ctx, args.evalSuiteId, { status: "active" });
    return { ok: true };
  },
});

export const recordCaseResult = mutation({
  args: {
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
    const user = await getCurrentUser(ctx);
    const { doc } = await assertEvalRunAccess(ctx, args.evalRunId, user.clerkUserId, {
      requireWrite: true,
    });

    const result: CaseResultInput = {
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
    };

    const resultId = await recordEvalCaseResult(ctx, {
      workspaceId: doc.workspaceId,
      evalRunId: args.evalRunId,
      result,
    });
    return { resultId };
  },
});

export const finalizeRun = mutation({
  args: { evalRunId: v.id("evalRuns") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertEvalRunAccess(ctx, args.evalRunId, user.clerkUserId, { requireWrite: true });
    const run = await finalizeEvalRun(ctx, args.evalRunId, { actor: actorFromUser(user) });
    const results = await listEvalResultsForRun(ctx, args.evalRunId);
    return { run, results };
  },
});

export const recommendForWorkstream = query({
  args: { workstreamId: v.id("workstreams") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const ws = await ctx.db.get(args.workstreamId);
    if (!ws) throw new Error("Workstream not found");

    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      ws.workspaceId,
      user.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);
    if (ws.projectId && accessible !== "all" && !accessible.has(ws.projectId)) {
      throw new Error("Access denied");
    }

    const allSuites = await listEvalSuitesForWorkspace(ctx, ws.workspaceId, {
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

export const rerunForRemediation = mutation({
  args: {
    recommendationId: v.optional(v.id("recommendations")),
    workstreamId: v.optional(v.id("workstreams")),
    evalSuiteId: v.id("evalSuites"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertEvalSuiteAccess(ctx, args.evalSuiteId, user.clerkUserId, { requireWrite: true });

    let resolvedRecommendationId = args.recommendationId;
    let workstreamId = args.workstreamId;
    let contextPackId: Id<"contextPacks"> | undefined;

    if (resolvedRecommendationId) {
      const rec = await ctx.db.get(resolvedRecommendationId);
      if (!rec) throw new Error("Recommendation not found");
      workstreamId = workstreamId ?? rec.remediationWorkstreamId ?? rec.convertedWorkstreamId;
      contextPackId = rec.remediationContextPackId ?? rec.generatedContextPackId;
    } else if (workstreamId) {
      const recs = await ctx.db
        .query("recommendations")
        .withIndex("by_workstream", (q) => q.eq("workstreamId", workstreamId))
        .collect();
      const remediationRec = recs.find((r) => r.source === "eval_failure" && r.evalSuiteId === args.evalSuiteId);
      if (remediationRec) {
        resolvedRecommendationId = remediationRec._id;
        contextPackId = remediationRec.remediationContextPackId ?? remediationRec.generatedContextPackId;
      }
    }

    const suite = await ctx.db.get(args.evalSuiteId);
    if (!suite) throw new Error("Eval suite not found");

    const runId = await createEvalRunDoc(ctx, {
      workspaceId: suite.workspaceId,
      evalSuiteId: args.evalSuiteId,
      projectId: suite.projectId,
      workstreamId: workstreamId ?? suite.workstreamId,
      recommendationId: resolvedRecommendationId,
      contextPackId,
      createdBy: createdByFromUser(user),
    });

    if (resolvedRecommendationId) {
      await ctx.db.patch(resolvedRecommendationId, {
        remediationEvalRunId: runId,
        remediationStatus: "fix_in_progress",
        updatedAt: Date.now(),
      });
    }

    await recordEvalRunStartedEvent(ctx, {
      workspaceId: suite.workspaceId,
      evalRunId: runId,
      suiteTitle: suite.title,
      actor: actorFromUser(user),
    });

    await insertEvent(ctx, {
      workspaceId: suite.workspaceId,
      source: "system",
      category: "system_event",
      type: "eval_run.remediation_rerun_started",
      actor: actorFromUser(user),
      title: `Remediation eval re-run started: ${suite.title}`,
      entity: { type: "other", id: runId, name: suite.title },
      visibility: "primary",
      importance: "normal",
      occurredAt: Date.now(),
    });

    const cases = await listEvalCasesForSuite(ctx, args.evalSuiteId);
    return {
      runId,
      cases,
      recommendationId: resolvedRecommendationId,
      workstreamId,
    };
  },
});

export const createSuite = mutation({
  args: {
    workspaceId: v.string(),
    title: v.string(),
    summary: v.string(),
    priority: evalSuitePriorityValidator,
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    cases: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        type: evalCaseTypeValidator,
        required: v.boolean(),
        config: v.any(),
        expected: v.optional(v.any()),
        order: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { membership } = await getMembershipAndAccessible(ctx, workspace._id, user.clerkUserId);
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");

    const draft = {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      title: args.title,
      summary: args.summary,
      source: "manual" as const,
      priority: args.priority,
      dedupKey: `manual:${Date.now()}:${user.clerkUserId}`,
      cases: args.cases,
    };

    const { suiteId, created } = await insertDraftEvalSuite(ctx, {
      ...draft,
      createdBy: createdByFromUser(user),
    });

    if (created) {
      await recordEvalSuiteGeneratedEvent(ctx, {
        workspaceId: workspace._id,
        evalSuiteId: suiteId,
        title: args.title,
        summary: args.summary,
        priority: args.priority,
        actor: actorFromUser(user),
      });
    }

    return { suiteId, created };
  },
});
