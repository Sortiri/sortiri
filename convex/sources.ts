import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { assertWorkspaceBrowseAccess } from "./lib/eventsLib";
import {
  getConnectionByWorkspaceSource,
} from "./lib/integrationConnectionsLib";
import { getActiveIntegrationSecret } from "./lib/integrationSecretsLib";
import { getActiveSecretForWorkspace as getLegacyGithubSecret } from "./lib/githubWebhookSecretsLib";

const TRACKED_SOURCES = [
  "cursor",
  "watcher",
  "cli",
  "sdk",
  "manual",
  "system",
  "github",
  "stripe",
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
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);

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

      let connected = eventCount > 0;

      if (source === "stripe" || source === "github") {
        const connection = await getConnectionByWorkspaceSource(ctx, workspace._id, source);
        const secretDoc = await getActiveIntegrationSecret(ctx, workspace._id, source);
        const legacyGithub =
          source === "github" && !secretDoc
            ? await getLegacyGithubSecret(ctx, workspace._id)
            : null;
        connected =
          Boolean(secretDoc) ||
          Boolean(legacyGithub) ||
          connection?.status === "connected" ||
          eventCount > 0;
      }

      statuses.push({
        source,
        connected,
        eventCount:
          source === "stripe" || source === "github"
            ? Math.max(
                eventCount,
                (await getConnectionByWorkspaceSource(ctx, workspace._id, source))?.eventCount ?? 0,
              )
            : eventCount,
        lastEventAt:
          source === "stripe" || source === "github"
            ? (await getConnectionByWorkspaceSource(ctx, workspace._id, source))?.lastEventAt ??
              lastEventAt
            : lastEventAt,
      });
    }

    return statuses;
  },
});
