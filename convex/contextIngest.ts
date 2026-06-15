import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { resolveIngestWorkspace } from "./lib/ingestAuth";
import {
  createContextPackDoc,
  docToContextPack,
  listItemsForContextPack,
} from "./lib/contextPackLib";
import { generateContextPackItems } from "./lib/contextPackGeneration";
import { formatContextPackText } from "./lib/contextPackFormat";
import { contextPackRequestValidator } from "./lib/validators";
import { DEFAULT_CONTEXT_TIME_WINDOW_MS } from "./lib/contextRelevance";
import { generateValidationRequirements } from "./lib/validationRequirements";
import { collectKnownFailures } from "./lib/knownFailures";
import { suggestPlaybooksForGoal, listPlaybooksForWorkspace } from "./lib/playbooksLib";
import { getMembershipAndAccessible } from "./lib/authz";
import { searchEntitiesForWorkspace } from "./lib/entitiesLib";
import { listEventsInRange } from "./lib/impactData";
import { insertEvent } from "./lib/eventsLib";

const ingestAuthArgs = {
  ingestKey: v.optional(v.string()),
  apiKeyId: v.optional(v.id("apiKeys")),
  workspaceId: v.string(),
};

async function resolveIngestActorUserId(
  ctx: Parameters<typeof getMembershipAndAccessible>[0],
  workspaceId: Id<"workspaces">,
  apiKeyId?: Id<"apiKeys">,
): Promise<string> {
  if (apiKeyId) {
    const apiKey = await ctx.db.get(apiKeyId);
    const createdBy = apiKey?.createdBy?.userId;
    if (createdBy) return createdBy;
  }
  const workspace = await ctx.db.get(workspaceId);
  return workspace?.userId ?? "api-key-agent";
}

export const createAndGenerate = mutation({
  args: {
    ...ingestAuthArgs,
    goal: v.string(),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    viewId: v.optional(v.id("savedViews")),
    entityId: v.optional(v.id("entities")),
    playbookId: v.optional(v.id("playbooks")),
    lessonId: v.optional(v.id("lessons")),
    impactAnalysisId: v.optional(v.id("impactAnalyses")),
    title: v.optional(v.string()),
    request: v.optional(contextPackRequestValidator),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const actorUserId = await resolveIngestActorUserId(ctx, workspace._id, args.apiKeyId);
    const request = {
      ...args.request,
      timeWindowMs: args.request?.timeWindowMs ?? DEFAULT_CONTEXT_TIME_WINDOW_MS,
    };

    const packId = await createContextPackDoc(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      viewId: args.viewId,
      entityId: args.entityId,
      playbookId: args.playbookId,
      lessonId: args.lessonId,
      impactAnalysisId: args.impactAnalysisId,
      title: args.title?.trim() || `Context: ${args.goal.slice(0, 80)}`,
      goal: args.goal.trim(),
      status: "generated",
      requestedBy: {
        type: "agent",
        clerkUserId: actorUserId,
        name: "Cursor Agent",
        source: "mcp",
      },
      request,
    });

    const result = await generateContextPackItems(ctx, packId, actorUserId);
    const formatted = formatContextPackText(
      docToContextPack((await ctx.db.get(packId))!),
      (await listItemsForContextPack(ctx, packId)).map((item) => item),
    );

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "system",
      category: "system_event",
      type: "context_pack.generated",
      actor: { type: "agent", name: "Cursor Agent" },
      title: `Context pack generated: ${args.title ?? args.goal.slice(0, 80)}`,
      summary: result.summary,
      entity: { type: "other", id: packId, name: args.goal.slice(0, 80) },
      visibility: "primary",
      importance: "normal",
      occurredAt: Date.now(),
    });

    return {
      contextPackId: packId,
      summary: result.summary,
      text: formatted,
      counts: result.counts,
    };
  },
});

export const getFormatted = query({
  args: {
    ...ingestAuthArgs,
    contextPackId: v.id("contextPacks"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const packDoc = await ctx.db.get(args.contextPackId);
    if (!packDoc || packDoc.workspaceId !== workspace._id) {
      throw new Error("Context pack not found");
    }
    const actorUserId = await resolveIngestActorUserId(ctx, workspace._id, args.apiKeyId);
    const { accessible } = await getMembershipAndAccessible(ctx, workspace._id, actorUserId);
    void accessible;

    const pack = docToContextPack(packDoc);
    const items = await listItemsForContextPack(ctx, args.contextPackId);

    return {
      text: formatContextPackText(pack, items),
      pack,
      items,
    };
  },
});

export const markUsedByAgent = mutation({
  args: {
    ...ingestAuthArgs,
    contextPackId: v.id("contextPacks"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const pack = await ctx.db.get(args.contextPackId);
    if (!pack || pack.workspaceId !== workspace._id) {
      throw new Error("Context pack not found");
    }
    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "system",
      category: "system_event",
      type: "context_pack.used_by_agent",
      actor: { type: "agent", name: "Cursor Agent" },
      title: `Context pack used by agent: ${pack.title}`,
      summary: pack.summary,
      entity: { type: "other", id: args.contextPackId, name: pack.title },
      visibility: "primary",
      importance: "normal",
      occurredAt: Date.now(),
    });
    return { success: true };
  },
});

export const getProjectMemory = query({
  args: {
    ...ingestAuthArgs,
    projectId: v.optional(v.id("projects")),
    query: v.optional(v.string()),
    timeWindowMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const actorUserId = await resolveIngestActorUserId(ctx, workspace._id, args.apiKeyId);
    const { accessible } = await getMembershipAndAccessible(ctx, workspace._id, actorUserId);
    const goal = args.query ?? "project memory";
    const windowMs = args.timeWindowMs ?? DEFAULT_CONTEXT_TIME_WINDOW_MS;
    const end = Date.now();
    const events = await listEventsInRange(ctx, workspace._id, end - windowMs, end, {
      projectId: args.projectId,
      accessibleProjects: accessible,
      scanLimit: 200,
    });
    const playbooks = await listPlaybooksForWorkspace(ctx, workspace._id, { status: "active", limit: 20 });
    return {
      goal,
      eventCount: events.length,
      recommendedPlaybook: suggestPlaybooksForGoal(playbooks, goal)[0] ?? null,
      failures: await collectKnownFailures(ctx, workspace._id, {
        windowMs,
        goal,
        projectId: args.projectId,
        accessible,
        limit: 5,
      }),
      validationRequirements: generateValidationRequirements({ goal }),
    };
  },
});

export const getEntityMemory = query({
  args: {
    ...ingestAuthArgs,
    entityKeyOrId: v.string(),
    timeWindowMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const actorUserId = await resolveIngestActorUserId(ctx, workspace._id, args.apiKeyId);
    const { accessible } = await getMembershipAndAccessible(ctx, workspace._id, actorUserId);
    const entities = await searchEntitiesForWorkspace(ctx, workspace._id, {
      query: args.entityKeyOrId,
      limit: 5,
    });
    const end = Date.now();
    const windowMs = args.timeWindowMs ?? DEFAULT_CONTEXT_TIME_WINDOW_MS;
    const events = await listEventsInRange(ctx, workspace._id, end - windowMs, end, {
      accessibleProjects: accessible,
      scanLimit: 300,
    }).then((list) =>
      list.filter((event) =>
        `${event.title} ${event.summary ?? ""} ${event.entity?.name ?? ""}`
          .toLowerCase()
          .includes(args.entityKeyOrId.toLowerCase()),
      ),
    );
    return { entity: entities[0] ?? null, events: events.slice(0, 20) };
  },
});

export const getKnownFailures = query({
  args: {
    ...ingestAuthArgs,
    goal: v.optional(v.string()),
    files: v.optional(v.array(v.string())),
    projectId: v.optional(v.id("projects")),
    timeWindowMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const actorUserId = await resolveIngestActorUserId(ctx, workspace._id, args.apiKeyId);
    const { accessible } = await getMembershipAndAccessible(ctx, workspace._id, actorUserId);
    return collectKnownFailures(ctx, workspace._id, {
      windowMs: args.timeWindowMs ?? DEFAULT_CONTEXT_TIME_WINDOW_MS,
      goal: args.goal,
      files: args.files,
      projectId: args.projectId,
      accessible,
    });
  },
});

export const getValidationRequirements = query({
  args: {
    ...ingestAuthArgs,
    goal: v.string(),
    files: v.optional(v.array(v.string())),
    sources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await resolveIngestWorkspace(ctx, args);
    return generateValidationRequirements({
      goal: args.goal,
      files: args.files,
      sources: args.sources,
    });
  },
});

export const getRecommendedPlaybook = query({
  args: {
    ...ingestAuthArgs,
    goal: v.string(),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const playbooks = await listPlaybooksForWorkspace(ctx, workspace._id, {
      status: "active",
      limit: 50,
    });
    const filtered = playbooks.filter(
      (pb) => !args.projectId || !pb.projectId || pb.projectId === args.projectId,
    );
    return suggestPlaybooksForGoal(filtered, args.goal)[0] ?? null;
  },
});
