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
  assertRecommendationAccess,
  createRecommendationDoc,
  docToRecommendation,
  filterRecommendationEvidence,
  findOpenRecommendationByDedupKey,
  listRecommendationsForProject,
  listRecommendationsForWorkspace,
  patchRecommendationDoc,
  type RecommendationRecord,
} from "./lib/recommendationLib";
import {
  collectAllDraftRecommendations,
  collectFailureRecommendations,
  collectImpactRecommendations,
  collectInsightRecommendations,
  collectLessonRecommendations,
  collectSourceHealthRecommendations,
  insertDraftRecommendations,
  type DraftRecommendation,
} from "./lib/recommendationEngine";
import { createContextPackDoc } from "./lib/contextPackLib";
import { generateContextPackItems } from "./lib/contextPackGeneration";
import { createWorkstream } from "./lib/workstreamMutations";
import { DEFAULT_CONTEXT_TIME_WINDOW_MS } from "./lib/contextRelevance";
import { insertDraftEvalSuite } from "./lib/evalLib";
import { loadRecommendationDraft } from "./lib/evalGeneration";
import { recordEvalSuiteGeneratedEvent } from "./lib/evalRunnerLib";
import {
  recommendationConfidenceValidator,
  recommendationPriorityValidator,
  recommendationSourceValidator,
  recommendationStatusValidator,
  recommendationTypeValidator,
  recommendationValidationRequirementValidator,
} from "./lib/validators";

async function recordRecommendationEvent(
  ctx: Parameters<typeof insertEvent>[0],
  input: {
    workspaceId: Id<"workspaces">;
    recommendationId: Id<"recommendations">;
    type:
      | "recommendation.generated"
      | "recommendation.dismissed"
      | "recommendation.accepted"
      | "recommendation.context_pack_generated"
      | "recommendation.converted_to_workstream";
    title: string;
    summary?: string;
    priority?: "low" | "normal" | "high" | "critical";
    actor?: { type: "human" | "agent" | "system"; name?: string; email?: string; id?: string };
  },
): Promise<void> {
  await insertEvent(ctx, {
    workspaceId: input.workspaceId,
    source: "system",
    category: "system_event",
    type: input.type,
    actor: input.actor ?? { type: "system", name: "Sortiri" },
    title: input.title,
    summary: input.summary,
    entity: { type: "other", id: input.recommendationId, name: input.title },
    visibility: "primary",
    importance: input.priority === "critical" ? "high" : "normal",
    occurredAt: Date.now(),
  });
}

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
    type: "human",
    clerkUserId: user.clerkUserId,
    email: user.email,
    name: user.name,
  };
}

async function generateAndRecord(
  ctx: Parameters<typeof insertDraftRecommendations>[0],
  workspaceId: Id<"workspaces">,
  accessible: Awaited<ReturnType<typeof getMembershipAndAccessible>>["accessible"],
  projectId: Id<"projects"> | undefined,
  user: Awaited<ReturnType<typeof getCurrentUser>>,
): Promise<{ createdIds: Id<"recommendations">[]; count: number }> {
  const drafts = await collectAllDraftRecommendations(ctx, workspaceId, accessible, projectId);
  const createdIds = await insertDraftRecommendations(ctx, drafts, createdByFromUser(user));

  for (const id of createdIds) {
    const doc = await ctx.db.get(id);
    if (!doc) continue;
    await recordRecommendationEvent(ctx, {
      workspaceId,
      recommendationId: id,
      type: "recommendation.generated",
      title: `Recommendation created: ${doc.title}`,
      summary: doc.summary,
      priority: doc.priority,
      actor: actorFromUser(user),
    });
  }

  return { createdIds, count: createdIds.length };
}

async function insertSingleDraft(
  ctx: Parameters<typeof createRecommendationDoc>[0],
  draft: DraftRecommendation,
  user: Awaited<ReturnType<typeof getCurrentUser>>,
): Promise<Id<"recommendations"> | null> {
  const existing = await findOpenRecommendationByDedupKey(ctx, draft.workspaceId, draft.dedupKey);
  if (existing) return null;

  const id = await createRecommendationDoc(ctx, {
    ...draft,
    status: "open",
    createdBy: createdByFromUser(user),
  });

  await recordRecommendationEvent(ctx, {
    workspaceId: draft.workspaceId,
    recommendationId: id,
    type: "recommendation.generated",
    title: `Recommendation created: ${draft.title}`,
    summary: draft.summary,
    priority: draft.priority,
    actor: actorFromUser(user),
  });

  return id;
}

export const generateForWorkspace = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      user.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) {
      throw new Error("Access denied");
    }

    return generateAndRecord(ctx, workspace._id, accessible, undefined, user);
  },
});

export const generateForProject = mutation({
  args: { workspaceId: v.string(), projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      user.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) {
      throw new Error("Access denied");
    }

    return generateAndRecord(ctx, workspace._id, accessible, args.projectId, user);
  },
});

export const generateFromInsight = mutation({
  args: { workspaceId: v.string(), insightFindingId: v.id("insightFindings") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { membership } = await getMembershipAndAccessible(ctx, workspace._id, user.clerkUserId);
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");

    const drafts = (await collectInsightRecommendations(ctx, workspace._id)).filter(
      (d) => d.evidenceInsightFindingIds?.includes(args.insightFindingId),
    );
    const id = drafts[0] ? await insertSingleDraft(ctx, drafts[0], user) : null;
    return { recommendationId: id };
  },
});

export const generateFromImpactAnalysis = mutation({
  args: { workspaceId: v.string(), impactAnalysisId: v.id("impactAnalyses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { membership } = await getMembershipAndAccessible(ctx, workspace._id, user.clerkUserId);
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");

    const drafts = (await collectImpactRecommendations(ctx, workspace._id)).filter((d) =>
      d.evidenceImpactAnalysisIds?.includes(args.impactAnalysisId),
    );
    const id = drafts[0] ? await insertSingleDraft(ctx, drafts[0], user) : null;
    return { recommendationId: id };
  },
});

export const generateFromLesson = mutation({
  args: { workspaceId: v.string(), lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { membership } = await getMembershipAndAccessible(ctx, workspace._id, user.clerkUserId);
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");

    const drafts = (await collectLessonRecommendations(ctx, workspace._id)).filter((d) =>
      d.evidenceLessonIds?.includes(args.lessonId),
    );
    const id = drafts[0] ? await insertSingleDraft(ctx, drafts[0], user) : null;
    return { recommendationId: id };
  },
});

export const generateFromFailurePattern = mutation({
  args: {
    workspaceId: v.string(),
    failureType: v.string(),
    projectId: v.optional(v.id("projects")),
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

    const drafts = (await collectFailureRecommendations(
      ctx,
      workspace._id,
      accessible,
      args.projectId,
    )).filter((d) => d.dedupKey.includes(args.failureType));
    const id = drafts[0] ? await insertSingleDraft(ctx, drafts[0], user) : null;
    return { recommendationId: id };
  },
});

export const generateFromSourceHealth = mutation({
  args: { workspaceId: v.string(), source: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { membership } = await getMembershipAndAccessible(ctx, workspace._id, user.clerkUserId);
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");

    const drafts = (await collectSourceHealthRecommendations(ctx, workspace._id)).filter((d) =>
      d.dedupKey.includes(args.source),
    );
    const id = drafts[0] ? await insertSingleDraft(ctx, drafts[0], user) : null;
    return { recommendationId: id };
  },
});

export const createManual = mutation({
  args: {
    workspaceId: v.string(),
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    summary: v.string(),
    type: recommendationTypeValidator,
    source: v.optional(recommendationSourceValidator),
    priority: v.optional(recommendationPriorityValidator),
    confidence: v.optional(recommendationConfidenceValidator),
    reason: v.optional(v.string()),
    suggestedGoal: v.optional(v.string()),
    suggestedWorkstreamTitle: v.optional(v.string()),
    validationRequirements: v.optional(v.array(recommendationValidationRequirementValidator)),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { membership } = await getMembershipAndAccessible(ctx, workspace._id, user.clerkUserId);
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");

    const id = await createRecommendationDoc(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      title: args.title.trim(),
      summary: args.summary.trim(),
      type: args.type,
      source: args.source ?? "manual",
      status: "open",
      priority: args.priority ?? "normal",
      confidence: args.confidence ?? "possible",
      reason: args.reason,
      suggestedGoal: args.suggestedGoal ?? args.title,
      suggestedWorkstreamTitle: args.suggestedWorkstreamTitle,
      validationRequirements: args.validationRequirements,
      dedupKey: `manual:${Date.now()}:${user.clerkUserId}`,
      createdBy: createdByFromUser(user),
    });

    await recordRecommendationEvent(ctx, {
      workspaceId: workspace._id,
      recommendationId: id,
      type: "recommendation.generated",
      title: `Recommendation created: ${args.title}`,
      summary: args.summary,
      priority: args.priority ?? "normal",
      actor: actorFromUser(user),
    });

    return { recommendationId: id };
  },
});

export const getById = query({
  args: { recommendationId: v.id("recommendations") },
  handler: async (ctx, args): Promise<RecommendationRecord> => {
    const user = await getCurrentUser(ctx);
    const { doc, accessible } = await assertRecommendationAccess(
      ctx,
      args.recommendationId,
      user.clerkUserId,
    );
    return filterRecommendationEvidence(ctx, docToRecommendation(doc), accessible);
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.string(),
    status: v.optional(recommendationStatusValidator),
    priority: v.optional(recommendationPriorityValidator),
    source: v.optional(recommendationSourceValidator),
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

    const records = await listRecommendationsForWorkspace(ctx, workspace._id, {
      status: args.status,
      priority: args.priority,
      source: args.source,
      limit: args.limit ?? 100,
    });

    const filtered: RecommendationRecord[] = [];
    for (const record of records) {
      if (record.projectId) {
        const projectId = record.projectId as Id<"projects">;
        if (accessible !== "all" && !accessible.has(projectId)) continue;
      }
      filtered.push(await filterRecommendationEvidence(ctx, record, accessible));
    }
    return filtered;
  },
});

export const listByProject = query({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
    status: v.optional(recommendationStatusValidator),
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

    if (accessible !== "all" && !accessible.has(args.projectId)) {
      throw new Error("Access denied");
    }

    const records = await listRecommendationsForProject(ctx, args.projectId, {
      status: args.status,
      limit: args.limit ?? 100,
    });

    const filtered: RecommendationRecord[] = [];
    for (const record of records) {
      filtered.push(await filterRecommendationEvidence(ctx, record, accessible));
    }
    return filtered;
  },
});

export const accept = mutation({
  args: { recommendationId: v.id("recommendations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { doc } = await assertRecommendationAccess(ctx, args.recommendationId, user.clerkUserId, {
      requireWrite: true,
    });

    await patchRecommendationDoc(ctx, args.recommendationId, { status: "accepted" });
    await recordRecommendationEvent(ctx, {
      workspaceId: doc.workspaceId,
      recommendationId: args.recommendationId,
      type: "recommendation.accepted",
      title: `Recommendation accepted: ${doc.title}`,
      summary: doc.summary,
      priority: doc.priority,
      actor: actorFromUser(user),
    });

    return { success: true };
  },
});

export const dismiss = mutation({
  args: { recommendationId: v.id("recommendations"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { doc } = await assertRecommendationAccess(ctx, args.recommendationId, user.clerkUserId, {
      requireWrite: true,
    });

    await patchRecommendationDoc(ctx, args.recommendationId, {
      status: "dismissed",
      dismissedReason: args.reason,
    });
    await recordRecommendationEvent(ctx, {
      workspaceId: doc.workspaceId,
      recommendationId: args.recommendationId,
      type: "recommendation.dismissed",
      title: `Recommendation dismissed: ${doc.title}`,
      summary: args.reason ?? doc.summary,
      priority: doc.priority,
      actor: actorFromUser(user),
    });

    return { success: true };
  },
});

export const archive = mutation({
  args: { recommendationId: v.id("recommendations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertRecommendationAccess(ctx, args.recommendationId, user.clerkUserId, {
      requireWrite: true,
    });
    await patchRecommendationDoc(ctx, args.recommendationId, { status: "archived" });
    return { success: true };
  },
});

export const generateContextPack = mutation({
  args: { recommendationId: v.id("recommendations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { doc } = await assertRecommendationAccess(ctx, args.recommendationId, user.clerkUserId, {
      requireWrite: true,
    });

    const goal = doc.suggestedGoal ?? doc.title;
    const packId = await createContextPackDoc(ctx, {
      workspaceId: doc.workspaceId,
      projectId: doc.projectId,
      workstreamId: doc.workstreamId,
      entityId: doc.entityId,
      viewId: doc.viewId,
      playbookId: doc.recommendedPlaybookId,
      title: `Context: ${doc.title.slice(0, 80)}`,
      goal,
      status: "generated",
      requestedBy: {
        type: "human",
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
        source: "recommendation",
      },
      request: { timeWindowMs: DEFAULT_CONTEXT_TIME_WINDOW_MS },
    });

    const result = await generateContextPackItems(ctx, packId, user.clerkUserId);
    await patchRecommendationDoc(ctx, args.recommendationId, {
      generatedContextPackId: packId,
    });

    await recordRecommendationEvent(ctx, {
      workspaceId: doc.workspaceId,
      recommendationId: args.recommendationId,
      type: "recommendation.context_pack_generated",
      title: `Context pack generated for recommendation: ${doc.title}`,
      summary: result.summary,
      priority: doc.priority,
      actor: actorFromUser(user),
    });

    return { contextPackId: packId, summary: result.summary, counts: result.counts };
  },
});

export const convertToWorkstream = mutation({
  args: {
    recommendationId: v.id("recommendations"),
    generateEvalSuite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { doc } = await assertRecommendationAccess(ctx, args.recommendationId, user.clerkUserId, {
      requireWrite: true,
    });

    const title = doc.suggestedWorkstreamTitle ?? doc.title;
    const goal = doc.suggestedGoal ?? doc.title;

    const workstreamId = await createWorkstream(ctx, {
      workspaceId: doc.workspaceId,
      projectId: doc.projectId,
      title,
      summary: doc.summary,
      createdBy: { type: "human", id: user.clerkUserId, name: user.name },
    });

    const packId = await createContextPackDoc(ctx, {
      workspaceId: doc.workspaceId,
      projectId: doc.projectId,
      workstreamId,
      entityId: doc.entityId,
      playbookId: doc.recommendedPlaybookId,
      title: `Context: ${title.slice(0, 80)}`,
      goal,
      status: "generated",
      requestedBy: {
        type: "human",
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
        source: "recommendation",
      },
      request: { timeWindowMs: DEFAULT_CONTEXT_TIME_WINDOW_MS },
    });

    const packResult = await generateContextPackItems(ctx, packId, user.clerkUserId);

    await patchRecommendationDoc(ctx, args.recommendationId, {
      status: "converted_to_workstream",
      convertedWorkstreamId: workstreamId,
      generatedContextPackId: packId,
    });

    await insertEvent(ctx, {
      workspaceId: doc.workspaceId,
      projectId: doc.projectId,
      source: "system",
      category: "system_event",
      type: "workstream.started",
      actor: actorFromUser(user),
      title: `Workstream started: ${title}`,
      summary: doc.reason ?? doc.summary,
      workstreamId,
      visibility: "primary",
      importance: doc.priority === "critical" ? "high" : "normal",
      occurredAt: Date.now(),
    });

    await recordRecommendationEvent(ctx, {
      workspaceId: doc.workspaceId,
      recommendationId: args.recommendationId,
      type: "recommendation.converted_to_workstream",
      title: `Recommendation converted to workstream: ${title}`,
      summary: packResult.summary,
      priority: doc.priority,
      actor: actorFromUser(user),
    });

    let evalSuiteId: Id<"evalSuites"> | undefined;
    if (args.generateEvalSuite) {
      const draft = await loadRecommendationDraft(ctx, args.recommendationId);
      draft.workstreamId = workstreamId;
      draft.contextPackId = packId;
      const inserted = await insertDraftEvalSuite(ctx, {
        ...draft,
        createdBy: createdByFromUser(user),
      });
      evalSuiteId = inserted.suiteId;
      if (inserted.created) {
        await recordEvalSuiteGeneratedEvent(ctx, {
          workspaceId: doc.workspaceId,
          evalSuiteId: inserted.suiteId,
          title: draft.title,
          summary: draft.summary,
          priority: draft.priority,
          actor: actorFromUser(user),
        });
      }
    }

    return {
      workstreamId,
      contextPackId: packId,
      recommendedPlaybookId: doc.recommendedPlaybookId,
      validationRequirements: doc.validationRequirements,
      evalSuiteId,
    };
  },
});
