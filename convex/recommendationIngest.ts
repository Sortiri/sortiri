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
  patchRecommendationDoc,
} from "./lib/recommendationLib";
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
      type: "recommendation.converted_to_workstream",
      actor: { type: "agent", name: actor.name, id: actor.clerkUserId },
      title: `Recommendation converted to workstream: ${title}`,
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
    };
  },
});
