import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { assertWorkspaceAccess } from "./lib/eventsLib";

const TRACKED_SOURCES = [
  "cursor",
  "watcher",
  "cli",
  "sdk",
  "manual",
  "system",
  "github",
] as const;

export type SourceStatus = {
  source: (typeof TRACKED_SOURCES)[number];
  connected: boolean;
  eventCount: number;
  lastEventAt?: number;
};

export const getSourceStatus = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<SourceStatus[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);

    const statuses: SourceStatus[] = [];

    for (const source of TRACKED_SOURCES) {
      const docs = await ctx.db
        .query("events")
        .withIndex("by_source", (q) =>
          q.eq("workspaceId", workspace._id).eq("source", source),
        )
        .collect();

      const eventCount = docs.length;
      const lastEventAt =
        eventCount > 0
          ? docs.reduce(
              (max, doc) => (doc.occurredAt > max ? doc.occurredAt : max),
              docs[0]!.occurredAt,
            )
          : undefined;

      statuses.push({
        source,
        connected: eventCount > 0,
        eventCount,
        lastEventAt,
      });
    }

    return statuses;
  },
});
