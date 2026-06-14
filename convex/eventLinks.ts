import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { requireWorkspaceRole } from "./lib/authz";
import { listEventsInWindow, listWorkstreamsForInsight } from "./lib/insightData";
import {
  assertEventAccess,
  assertWorkspaceAccess,
  listEventsByWorkstream,
} from "./lib/eventsLib";
import {
  countLinksForEventIds,
  findDuplicateLink,
  insertEventLinkDoc,
  listLinksForEvent,
  listRelatedForWorkstream,
  type RelatedHistoryItem,
  type WorkstreamRelatedGroup,
} from "./lib/eventLinksLib";
import { generateLinksForEvents, windowToMs } from "./lib/linkRules";
import { eventLinkTypeValidator } from "./lib/validators";
import { assertWorkstreamAccess } from "./lib/workstreamsLib";
import type { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    workspaceId: v.string(),
    fromEventId: v.optional(v.id("events")),
    toEventId: v.optional(v.id("events")),
    fromWorkstreamId: v.optional(v.id("workstreams")),
    toWorkstreamId: v.optional(v.id("workstreams")),
    type: eventLinkTypeValidator,
    confidence: v.number(),
    reason: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{ linkId: Id<"eventLinks">; duplicate: boolean }> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);

    if (args.fromEventId && args.toEventId) {
      const duplicate = await findDuplicateLink(
        ctx,
        workspace._id,
        args.fromEventId,
        args.toEventId,
        args.type,
      );
      if (duplicate) {
        return { linkId: duplicate._id, duplicate: true };
      }
    }

    const linkId = await insertEventLinkDoc(ctx, {
      workspaceId: workspace._id,
      fromEventId: args.fromEventId,
      toEventId: args.toEventId,
      fromWorkstreamId: args.fromWorkstreamId,
      toWorkstreamId: args.toWorkstreamId,
      type: args.type,
      confidence: args.confidence,
      reason: args.reason,
      createdBy: "human",
      metadata: args.metadata,
    });

    return { linkId, duplicate: false };
  },
});

export const listForEvent = query({
  args: {
    eventId: v.id("events"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<RelatedHistoryItem[]> => {
    const userId = await requireUserId(ctx);
    await assertEventAccess(ctx, args.eventId, userId);
    return listLinksForEvent(ctx, args.eventId, args.limit ?? 20);
  },
});

export const listForWorkstream = query({
  args: {
    workstreamId: v.id("workstreams"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<WorkstreamRelatedGroup[]> => {
    const userId = await requireUserId(ctx);
    await assertWorkstreamAccess(ctx, args.workstreamId, userId);

    const events = await listEventsByWorkstream(ctx, args.workstreamId, { limit: 100 });
    const workstreamEventIds = new Set(events.map((event) => event.id));

    return listRelatedForWorkstream(
      ctx,
      args.workstreamId,
      workstreamEventIds,
      args.limit ?? 30,
    );
  },
});

export const countForEvents = query({
  args: {
    workspaceId: v.string(),
    eventIds: v.array(v.id("events")),
  },
  handler: async (ctx, args): Promise<Record<string, number>> => {
    const userId = await requireUserId(ctx);
    await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    return countLinksForEventIds(ctx, args.eventIds);
  },
});

export const generateForWorkspace = mutation({
  args: {
    workspaceId: v.string(),
    window: v.optional(v.union(v.literal("24h"), v.literal("7d"), v.literal("30d"))),
  },
  handler: async (ctx, args): Promise<{ created: number; skipped: number }> => {
    const userId = await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
    ]);
    const windowKey = args.window ?? "7d";
    const windowStart = Date.now() - windowToMs(windowKey);

    const events = await listEventsInWindow(ctx, workspace._id, windowStart);
    const workstreams = await listWorkstreamsForInsight(ctx, workspace._id);
    const candidates = generateLinksForEvents(events, workstreams);

    let created = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      const duplicate = await findDuplicateLink(
        ctx,
        workspace._id,
        candidate.fromEventId,
        candidate.toEventId,
        candidate.type,
      );

      if (duplicate) {
        skipped++;
        continue;
      }

      await insertEventLinkDoc(ctx, {
        workspaceId: workspace._id,
        fromEventId: candidate.fromEventId,
        toEventId: candidate.toEventId,
        fromWorkstreamId: candidate.fromWorkstreamId,
        toWorkstreamId: candidate.toWorkstreamId,
        type: candidate.type,
        confidence: candidate.confidence,
        reason: candidate.reason,
        createdBy: "system",
      });
      created++;
    }

    return { created, skipped };
  },
});

export const deleteLink = mutation({
  args: {
    workspaceId: v.string(),
    linkId: v.id("eventLinks"),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    const link = await ctx.db.get(args.linkId);
    if (!link || link.workspaceId !== workspace._id) {
      throw new Error("Link not found");
    }
    await ctx.db.delete(args.linkId);
  },
});

export type { RelatedHistoryItem, WorkstreamRelatedGroup };
