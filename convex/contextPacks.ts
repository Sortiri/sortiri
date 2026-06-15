import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  assertNotAuditorWorkspaceBrowse,
  canViewEvent,
  canViewWorkstream,
  getCurrentUser,
  getMembershipAndAccessible,
} from "./lib/authz";
import { assertWorkspaceBrowseAccess, insertEvent } from "./lib/eventsLib";
import {
  createContextPackDoc,
  docToContextPack,
  docToContextPackItem,
  listContextPacksForEntity,
  listContextPacksForProject,
  listContextPacksForWorkstream,
  listContextPacksForWorkspace,
  listItemsForContextPack,
  patchContextPackDoc,
  type ContextPackItemRecord,
  type ContextPackRecord,
} from "./lib/contextPackLib";
import { generateContextPackItems } from "./lib/contextPackGeneration";
import { formatContextPackText } from "./lib/contextPackFormat";
import { contextPackRequestValidator } from "./lib/validators";
import { DEFAULT_CONTEXT_TIME_WINDOW_MS } from "./lib/contextRelevance";
import { generateValidationRequirements } from "./lib/validationRequirements";
import { collectKnownFailures } from "./lib/knownFailures";
import { suggestPlaybooksForGoal, listPlaybooksForWorkspace } from "./lib/playbooksLib";
import { searchEntitiesForWorkspace } from "./lib/entitiesLib";
import { listEventsInRange } from "./lib/impactData";

const DEFAULT_TIME_WINDOW_MS = DEFAULT_CONTEXT_TIME_WINDOW_MS;

async function recordContextPackEvent(
  ctx: Parameters<typeof insertEvent>[0],
  input: {
    workspaceId: Id<"workspaces">;
    contextPackId: Id<"contextPacks">;
    type: "context_pack.generated" | "context_pack.failed" | "context_pack.used_by_agent";
    title: string;
    summary?: string;
    severity?: "info" | "warning" | "error";
    importance?: "normal" | "high";
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
    entity: { type: "other", id: input.contextPackId, name: input.title },
    visibility: "primary",
    importance: input.importance ?? "normal",
    severity: input.severity,
    occurredAt: Date.now(),
  });
}

async function assertContextPackAccess(
  ctx: Parameters<typeof getMembershipAndAccessible>[0],
  packId: Id<"contextPacks">,
  clerkUserId: string,
) {
  const pack = await ctx.db.get(packId);
  if (!pack) throw new Error("Context pack not found");
  const { membership, accessible } = await getMembershipAndAccessible(
    ctx,
    pack.workspaceId,
    clerkUserId,
  );
  assertNotAuditorWorkspaceBrowse(membership);
  return { pack, membership, accessible };
}

async function filterAccessibleItems(
  ctx: Parameters<typeof getMembershipAndAccessible>[0],
  items: ContextPackItemRecord[],
  accessible: Awaited<ReturnType<typeof getMembershipAndAccessible>>["accessible"],
): Promise<ContextPackItemRecord[]> {
  const filtered: ContextPackItemRecord[] = [];
  for (const item of items) {
    if (item.eventId) {
      const event = await ctx.db.get(item.eventId as Id<"events">);
      if (!event || !canViewEvent(event, accessible)) continue;
    }
    if (item.workstreamId) {
      const ws = await ctx.db.get(item.workstreamId as Id<"workstreams">);
      if (!ws || !canViewWorkstream(ws, accessible)) continue;
    }
    filtered.push(item);
  }
  return filtered;
}

export const create = mutation({
  args: {
    workspaceId: v.string(),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    viewId: v.optional(v.id("savedViews")),
    entityId: v.optional(v.id("entities")),
    playbookId: v.optional(v.id("playbooks")),
    lessonId: v.optional(v.id("lessons")),
    impactAnalysisId: v.optional(v.id("impactAnalyses")),
    goal: v.string(),
    title: v.optional(v.string()),
    request: v.optional(contextPackRequestValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { membership } = await getMembershipAndAccessible(ctx, workspace._id, user.clerkUserId);
    assertNotAuditorWorkspaceBrowse(membership);

    const request = {
      ...args.request,
      timeWindowMs: args.request?.timeWindowMs ?? DEFAULT_TIME_WINDOW_MS,
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
        type: "human",
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
        source: "ui",
      },
      request,
    });

    return { contextPackId: packId };
  },
});

export const generate = mutation({
  args: {
    contextPackId: v.id("contextPacks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { pack } = await assertContextPackAccess(ctx, args.contextPackId, user.clerkUserId);

    try {
      const result = await generateContextPackItems(ctx, args.contextPackId, user.clerkUserId);
      await recordContextPackEvent(ctx, {
        workspaceId: pack.workspaceId,
        contextPackId: args.contextPackId,
        type: "context_pack.generated",
        title: `Context pack generated: ${pack.title}`,
        summary: result.summary,
        actor: { type: "human", id: user.clerkUserId, name: user.name, email: user.email },
      });
      return { contextPackId: args.contextPackId, summary: result.summary, counts: result.counts };
    } catch (error) {
      await patchContextPackDoc(ctx, args.contextPackId, { status: "failed" });
      await recordContextPackEvent(ctx, {
        workspaceId: pack.workspaceId,
        contextPackId: args.contextPackId,
        type: "context_pack.failed",
        title: `Context pack failed: ${pack.title}`,
        summary: error instanceof Error ? error.message : "Generation failed",
        severity: "warning",
        importance: "high",
        actor: { type: "human", id: user.clerkUserId, name: user.name, email: user.email },
      });
      throw error;
    }
  },
});

export const getById = query({
  args: { contextPackId: v.id("contextPacks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { pack, accessible } = await assertContextPackAccess(ctx, args.contextPackId, user.clerkUserId);
    const items = await filterAccessibleItems(
      ctx,
      await listItemsForContextPack(ctx, args.contextPackId),
      accessible,
    );
    return { pack: docToContextPack(pack), items };
  },
});

export const listByWorkspace = query({
  args: { workspaceId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    return listContextPacksForWorkspace(ctx, workspace._id, args.limit ?? 50);
  },
});

export const listByProject = query({
  args: { workspaceId: v.string(), projectId: v.id("projects"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    return listContextPacksForProject(ctx, args.projectId, args.limit ?? 20).then((packs) =>
      packs.filter((pack) => pack.workspaceId === workspace._id),
    );
  },
});

export const listForWorkstream = query({
  args: { workstreamId: v.id("workstreams"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const ws = await ctx.db.get(args.workstreamId);
    if (!ws) throw new Error("Workstream not found");
    const workspace = await ctx.db.get(ws.workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    await assertWorkspaceBrowseAccess(ctx, workspace.externalId, user.clerkUserId);
    return listContextPacksForWorkstream(ctx, args.workstreamId, args.limit ?? 20);
  },
});

export const listForEntity = query({
  args: { entityId: v.id("entities"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const entity = await ctx.db.get(args.entityId);
    if (!entity) throw new Error("Entity not found");
    const workspace = await ctx.db.get(entity.workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    await assertWorkspaceBrowseAccess(ctx, workspace.externalId, user.clerkUserId);
    return listContextPacksForEntity(ctx, args.entityId, args.limit ?? 20);
  },
});

export const listItems = query({
  args: { contextPackId: v.id("contextPacks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { accessible } = await assertContextPackAccess(ctx, args.contextPackId, user.clerkUserId);
    return filterAccessibleItems(
      ctx,
      await listItemsForContextPack(ctx, args.contextPackId),
      accessible,
    );
  },
});

export const getFormatted = query({
  args: { contextPackId: v.id("contextPacks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { pack, accessible } = await assertContextPackAccess(ctx, args.contextPackId, user.clerkUserId);
    const record = docToContextPack(pack);
    const items = await filterAccessibleItems(
      ctx,
      await listItemsForContextPack(ctx, args.contextPackId),
      accessible,
    );
    return {
      text: formatContextPackText(record, items),
      pack: record,
      items,
    };
  },
});

export const archive = mutation({
  args: { contextPackId: v.id("contextPacks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertContextPackAccess(ctx, args.contextPackId, user.clerkUserId);
    await patchContextPackDoc(ctx, args.contextPackId, { status: "archived" });
    return { success: true };
  },
});

export const markUsedByAgent = mutation({
  args: { contextPackId: v.id("contextPacks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { pack } = await assertContextPackAccess(ctx, args.contextPackId, user.clerkUserId);
    await recordContextPackEvent(ctx, {
      workspaceId: pack.workspaceId,
      contextPackId: args.contextPackId,
      type: "context_pack.used_by_agent",
      title: `Context pack used by agent: ${pack.title}`,
      summary: pack.summary,
      actor: { type: "agent", name: user.name ?? "Agent", id: user.clerkUserId },
    });
    return { success: true };
  },
});

export const getValidationRequirements = query({
  args: {
    workspaceId: v.string(),
    goal: v.string(),
    files: v.optional(v.array(v.string())),
    sources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    return generateValidationRequirements({
      goal: args.goal,
      files: args.files,
      sources: args.sources,
    });
  },
});

export const getKnownFailures = query({
  args: {
    workspaceId: v.string(),
    goal: v.optional(v.string()),
    files: v.optional(v.array(v.string())),
    projectId: v.optional(v.id("projects")),
    timeWindowMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { accessible } = await getMembershipAndAccessible(ctx, workspace._id, user.clerkUserId);
    return collectKnownFailures(ctx, workspace._id, {
      windowMs: args.timeWindowMs ?? DEFAULT_TIME_WINDOW_MS,
      goal: args.goal,
      files: args.files,
      projectId: args.projectId,
      accessible,
    });
  },
});

export const getRecommendedPlaybook = query({
  args: {
    workspaceId: v.string(),
    goal: v.string(),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
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

export const getProjectMemory = query({
  args: {
    workspaceId: v.string(),
    projectId: v.optional(v.id("projects")),
    query: v.optional(v.string()),
    timeWindowMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const { accessible } = await getMembershipAndAccessible(ctx, workspace._id, user.clerkUserId);
    const goal = args.query ?? "project memory";
    const windowMs = args.timeWindowMs ?? DEFAULT_TIME_WINDOW_MS;
    const end = Date.now();
    const events = await listEventsInRange(ctx, workspace._id, end - windowMs, end, {
      projectId: args.projectId,
      accessibleProjects: accessible,
      scanLimit: 200,
    });
    const playbooks = await listPlaybooksForWorkspace(ctx, workspace._id, { status: "active", limit: 20 });
    const recommended = suggestPlaybooksForGoal(playbooks, goal)[0] ?? null;
    const failures = await collectKnownFailures(ctx, workspace._id, {
      windowMs,
      goal,
      projectId: args.projectId,
      accessible,
      limit: 5,
    });
    return {
      goal,
      eventCount: events.length,
      recommendedPlaybook: recommended,
      failures,
      validationRequirements: generateValidationRequirements({ goal }),
    };
  },
});

export const getEntityMemory = query({
  args: {
    workspaceId: v.string(),
    entityKeyOrId: v.string(),
    timeWindowMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, user.clerkUserId);
    const entities = await searchEntitiesForWorkspace(ctx, workspace._id, {
      query: args.entityKeyOrId,
      limit: 5,
    });
    const entity = entities[0] ?? null;
    const windowMs = args.timeWindowMs ?? DEFAULT_TIME_WINDOW_MS;
    const end = Date.now();
    const events = await listEventsInRange(ctx, workspace._id, end - windowMs, end, {
      accessibleProjects: (await getMembershipAndAccessible(ctx, workspace._id, user.clerkUserId)).accessible,
      scanLimit: 300,
    }).then((list) =>
      list.filter((event) =>
        `${event.title} ${event.summary ?? ""} ${event.entity?.name ?? ""}`
          .toLowerCase()
          .includes(args.entityKeyOrId.toLowerCase()),
      ),
    );
    return { entity, events: events.slice(0, 20) };
  },
});

export type { ContextPackRecord, ContextPackItemRecord };
