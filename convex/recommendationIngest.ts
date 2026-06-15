import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { resolveIngestWorkspace } from "./lib/ingestAuth";
import {
  assertNotAuditorWorkspaceBrowse,
  canWriteWorkspaceData,
  getMembershipAndAccessible,
} from "./lib/authz";
import { insertEvent } from "./lib/eventsLib";
import {
  docToRecommendation,
  filterRecommendationEvidence,
  listRecommendationsForWorkspace,
  listRemediationForEvalRun,
  listRemediationRecommendationsForWorkspace,
  patchRecommendationDoc,
  createRecommendationDoc,
  findOpenRecommendationByDedupKey,
} from "./lib/recommendationLib";
import {
  buildRemediationDraft,
  buildRemediationDraftsFromEvalRun,
} from "./lib/evalRemediation";
import {
  collectAllDraftRecommendations,
  insertDraftRecommendations,
} from "./lib/recommendationEngine";
import { createContextPackDoc } from "./lib/contextPackLib";
import { generateContextPackItems } from "./lib/contextPackGeneration";
import { createWorkstream } from "./lib/workstreamMutations";
import { DEFAULT_CONTEXT_TIME_WINDOW_MS } from "./lib/contextRelevance";

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
          type: "agent",
          clerkUserId: apiKey.createdBy.userId,
          email: apiKey.createdBy.email,
          name: apiKey.createdBy.name ?? "Cursor Agent",
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
      type: "agent",
      clerkUserId: workspace?.userId,
      name: "Cursor Agent",
      source: "mcp",
    },
  };
}

export const generateForWorkspace = mutation({
  args: ingestAuthArgs,
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const actor = await resolveIngestActor(ctx, workspace._id, args.apiKeyId);
    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      actor.clerkUserId,
    );
    assertNotAuditorWorkspaceBrowse(membership);
    if (!canWriteWorkspaceData(membership.role)) {
      throw new Error("Access denied");
    }

    const drafts = await collectAllDraftRecommendations(ctx, workspace._id, accessible);
    const createdIds = await insertDraftRecommendations(ctx, drafts, actor.createdBy);

    for (const id of createdIds) {
      const doc = await ctx.db.get(id);
      if (!doc) continue;
      await insertEvent(ctx, {
        workspaceId: workspace._id,
        source: "system",
        category: "system_event",
        type: "recommendation.generated",
        actor: { type: "agent", name: actor.name, email: actor.email, id: actor.clerkUserId },
        title: `Recommendation created: ${doc.title}`,
        summary: doc.summary,
        entity: { type: "other", id, name: doc.title },
        visibility: "primary",
        importance: doc.priority === "critical" ? "high" : "normal",
        occurredAt: Date.now(),
      });
    }

    return { createdIds, count: createdIds.length };
  },
});

export const listOpen = query({
  args: {
    ...ingestAuthArgs,
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

    const records = await listRecommendationsForWorkspace(ctx, workspace._id, {
      status: "open",
      limit: args.limit ?? 50,
    });

    const filtered = [];
    for (const record of records) {
      filtered.push(await filterRecommendationEvidence(ctx, record, accessible));
    }
    return filtered;
  },
});

export const getById = query({
  args: {
    ...ingestAuthArgs,
    recommendationId: v.id("recommendations"),
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

    const doc = await ctx.db.get(args.recommendationId);
    if (!doc || doc.workspaceId !== workspace._id) {
      throw new Error("Recommendation not found");
    }

    return filterRecommendationEvidence(ctx, docToRecommendation(doc), accessible);
  },
});

export const generateContextPack = mutation({
  args: {
    ...ingestAuthArgs,
    recommendationId: v.id("recommendations"),
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
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");

    const doc = await ctx.db.get(args.recommendationId);
    if (!doc || doc.workspaceId !== workspace._id) {
      throw new Error("Recommendation not found");
    }

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
        type: "agent",
        clerkUserId: actor.clerkUserId,
        email: actor.email,
        name: actor.name,
        source: "mcp",
      },
      request: { timeWindowMs: DEFAULT_CONTEXT_TIME_WINDOW_MS },
    });

    const result = await generateContextPackItems(ctx, packId, actor.clerkUserId);
    await patchRecommendationDoc(ctx, args.recommendationId, {
      generatedContextPackId: packId,
    });

    await insertEvent(ctx, {
      workspaceId: doc.workspaceId,
      source: "system",
      category: "system_event",
      type: "recommendation.context_pack_generated",
      actor: { type: "agent", name: actor.name, id: actor.clerkUserId },
      title: `Context pack generated for recommendation: ${doc.title}`,
      summary: result.summary,
      entity: { type: "other", id: args.recommendationId, name: doc.title },
      visibility: "primary",
      importance: doc.priority === "critical" ? "high" : "normal",
      occurredAt: Date.now(),
    });

    return { contextPackId: packId, summary: result.summary, counts: result.counts };
  },
});

export const convertToWorkstream = mutation({
  args: {
    ...ingestAuthArgs,
    recommendationId: v.id("recommendations"),
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
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");

    const doc = await ctx.db.get(args.recommendationId);
    if (!doc || doc.workspaceId !== workspace._id) {
      throw new Error("Recommendation not found");
    }

    const title = doc.suggestedWorkstreamTitle ?? doc.title;
    const goal = doc.suggestedGoal ?? doc.title;

    const workstreamId = await createWorkstream(ctx, {
      workspaceId: doc.workspaceId,
      projectId: doc.projectId,
      title,
      summary: doc.summary,
      createdBy: { type: "agent", id: actor.clerkUserId, name: actor.name },
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
        type: "agent",
        clerkUserId: actor.clerkUserId,
        email: actor.email,
        name: actor.name,
        source: "mcp",
      },
      request: { timeWindowMs: DEFAULT_CONTEXT_TIME_WINDOW_MS },
    });

    const packResult = await generateContextPackItems(ctx, packId, actor.clerkUserId);
    const isRemediation = doc.source === "eval_failure" && !!doc.evalRunId;

    await patchRecommendationDoc(ctx, args.recommendationId, {
      status: "converted_to_workstream",
      convertedWorkstreamId: workstreamId,
      generatedContextPackId: packId,
      ...(isRemediation
        ? {
            remediationWorkstreamId: workstreamId,
            remediationContextPackId: packId,
            remediationStatus: "workstream_created" as const,
          }
        : {}),
    });

    await insertEvent(ctx, {
      workspaceId: doc.workspaceId,
      projectId: doc.projectId,
      source: "system",
      category: "system_event",
      type: "workstream.started",
      actor: { type: "agent", name: actor.name, id: actor.clerkUserId },
      title: `Workstream started: ${title}`,
      summary: doc.reason ?? doc.summary,
      workstreamId,
      visibility: "primary",
      importance: doc.priority === "critical" ? "high" : "normal",
      occurredAt: Date.now(),
    });

    await insertEvent(ctx, {
      workspaceId: doc.workspaceId,
      source: "system",
      category: "system_event",
      type: isRemediation
        ? "recommendation.converted_to_remediation_workstream"
        : "recommendation.converted_to_workstream",
      actor: { type: "agent", name: actor.name, id: actor.clerkUserId },
      title: isRemediation
        ? `Remediation converted to workstream: ${title}`
        : `Recommendation converted to workstream: ${title}`,
      summary: packResult.summary,
      entity: { type: "other", id: args.recommendationId, name: doc.title },
      visibility: "primary",
      importance: doc.priority === "critical" ? "high" : "normal",
      occurredAt: Date.now(),
    });

    return {
      workstreamId,
      contextPackId: packId,
      recommendedPlaybookId: doc.recommendedPlaybookId,
      validationRequirements: doc.validationRequirements,
      evalRunId: doc.evalRunId,
      evalResultId: doc.evalResultId,
      remediationStatus: doc.source === "eval_failure" ? ("workstream_created" as const) : undefined,
    };
  },
});

export const generateFromEvalRun = mutation({
  args: {
    ...ingestAuthArgs,
    evalRunId: v.id("evalRuns"),
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
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");

    const runDoc = await ctx.db.get(args.evalRunId);
    if (!runDoc || runDoc.workspaceId !== workspace._id) {
      throw new Error("Eval run not found");
    }

    if (!["failed", "error", "needs_review"].includes(runDoc.status)) {
      throw new Error("Eval run does not need remediation");
    }

    const inputs = await buildRemediationDraftsFromEvalRun(ctx, args.evalRunId);
    const createdIds: Id<"recommendations">[] = [];

    for (const input of inputs) {
      const draft = await buildRemediationDraft(ctx, input);
      if (!draft) continue;

      const existing = await findOpenRecommendationByDedupKey(
        ctx,
        draft.workspaceId,
        draft.dedupKey!,
      );
      if (existing) continue;

      const id = await createRecommendationDoc(ctx, {
        ...draft,
        status: "open",
        createdBy: actor.createdBy,
      });
      createdIds.push(id);

      await insertEvent(ctx, {
        workspaceId: draft.workspaceId,
        source: "system",
        category: "system_event",
        type: "recommendation.generated_from_eval_failure",
        actor: { type: "agent", name: actor.name, id: actor.clerkUserId },
        title: `Remediation recommendation created: ${draft.title}`,
        summary: draft.summary,
        entity: { type: "other", id, name: draft.title },
        visibility: "primary",
        importance: draft.priority === "critical" ? "high" : "normal",
        occurredAt: Date.now(),
      });
    }

    return { recommendationIds: createdIds, count: createdIds.length };
  },
});

export const listRemediations = query({
  args: {
    ...ingestAuthArgs,
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

    const records = await listRemediationRecommendationsForWorkspace(ctx, workspace._id, {
      status: "open",
      limit: args.limit ?? 50,
    });

    const filtered = [];
    for (const record of records) {
      filtered.push(await filterRecommendationEvidence(ctx, record, accessible));
    }
    return filtered;
  },
});

export const listForEvalRun = query({
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
    if (!run || run.workspaceId !== workspace._id) throw new Error("Eval run not found");

    const records = await listRemediationForEvalRun(ctx, workspace._id, args.evalRunId);
    const filtered = [];
    for (const record of records) {
      filtered.push(await filterRecommendationEvidence(ctx, record, accessible));
    }
    return filtered;
  },
});

export const generateRemediationContextPack = mutation({
  args: {
    ...ingestAuthArgs,
    recommendationId: v.id("recommendations"),
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
    if (!canWriteWorkspaceData(membership.role)) throw new Error("Access denied");

    const doc = await ctx.db.get(args.recommendationId);
    if (!doc || doc.workspaceId !== workspace._id) throw new Error("Recommendation not found");
    if (!doc.evalRunId) throw new Error("Recommendation is not from an eval failure");

    const goal = doc.suggestedGoal ?? doc.title;
    const packId = await createContextPackDoc(ctx, {
      workspaceId: doc.workspaceId,
      projectId: doc.projectId,
      workstreamId: doc.workstreamId,
      entityId: doc.entityId,
      viewId: doc.viewId,
      playbookId: doc.recommendedPlaybookId,
      title: `Context for fixing failed eval: ${doc.title.slice(0, 60)}`,
      goal,
      status: "generated",
      requestedBy: {
        type: "agent",
        clerkUserId: actor.clerkUserId,
        email: actor.email,
        name: actor.name,
        source: "eval_remediation",
      },
      request: { timeWindowMs: DEFAULT_CONTEXT_TIME_WINDOW_MS },
    });

    const result = await generateContextPackItems(ctx, packId, actor.clerkUserId);
    await patchRecommendationDoc(ctx, args.recommendationId, {
      generatedContextPackId: packId,
      remediationContextPackId: packId,
      remediationStatus: "context_generated",
    });

    await insertEvent(ctx, {
      workspaceId: doc.workspaceId,
      source: "system",
      category: "system_event",
      type: "recommendation.remediation_context_generated",
      actor: { type: "agent", name: actor.name, id: actor.clerkUserId },
      title: `Remediation context pack generated: ${doc.title}`,
      summary: result.summary,
      entity: { type: "other", id: args.recommendationId, name: doc.title },
      visibility: "primary",
      importance: doc.priority === "critical" ? "high" : "normal",
      occurredAt: Date.now(),
    });

    return { contextPackId: packId, summary: result.summary, counts: result.counts };
  },
});
