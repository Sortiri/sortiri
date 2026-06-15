import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireUserId } from "../lib/auth";
import { assertWorkspaceBrowseAccess } from "../lib/eventsLib";
import {
  getIntegrationConnection,
} from "../lib/integrationSharedLib";
import { getActiveIntegrationSecretMetadata } from "../lib/integrationSharedLib";
import { getActiveSecretForWorkspace as getLegacyGithubSecret } from "../lib/githubWebhookSecretsLib";

const EXTERNAL_SOURCES = ["github", "stripe", "posthog"] as const;
const LOCAL_SOURCES = ["cursor", "watcher", "sdk", "cli", "manual"] as const;

export type SourceHealthStatus =
  | "connected"
  | "not_connected"
  | "error"
  | "revoked";

export type SourceHealthEntry = {
  source:
    | "github"
    | "stripe"
    | "posthog"
    | "cursor"
    | "watcher"
    | "sdk"
    | "cli"
    | "manual";
  status: SourceHealthStatus;
  eventCount: number;
  primaryEventCount: number;
  lastEventAt?: number;
  lastError?: string;
  hasActiveSecret?: boolean;
  secretLast4?: string;
  connectionId?: string;
};

export function deriveExternalStatus(input: {
  connectionStatus?: string;
  hasActiveSecret: boolean;
  lastError?: string;
  hasEvents: boolean;
}): SourceHealthStatus {
  if (input.lastError) return "error";
  if (input.connectionStatus === "revoked") return "revoked";
  if (input.hasActiveSecret || input.connectionStatus === "connected" || input.hasEvents) {
    return "connected";
  }
  return "not_connected";
}

export const getSourceHealth = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<SourceHealthEntry[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);

    const entries: SourceHealthEntry[] = [];

    for (const source of LOCAL_SOURCES) {
      const docs = await ctx.db
        .query("events")
        .withIndex("by_source", (q) =>
          q.eq("workspaceId", workspace._id).eq("source", source),
        )
        .collect();

      const primaryEventCount = docs.filter((doc) => doc.visibility === "primary").length;
      const eventCount = docs.length;
      const lastEventAt =
        eventCount > 0
          ? docs.reduce(
              (max, doc) => (doc.occurredAt > max ? doc.occurredAt : max),
              docs[0]!.occurredAt,
            )
          : undefined;

      entries.push({
        source,
        status: eventCount > 0 ? "connected" : "not_connected",
        eventCount,
        primaryEventCount,
        lastEventAt,
      });
    }

    for (const source of EXTERNAL_SOURCES) {
      const docs = await ctx.db
        .query("events")
        .withIndex("by_source", (q) =>
          q.eq("workspaceId", workspace._id).eq("source", source),
        )
        .collect();

      const primaryEventCount = docs.filter((doc) => doc.visibility === "primary").length;
      const eventCountFromEvents = docs.length;
      const lastEventFromEvents =
        eventCountFromEvents > 0
          ? docs.reduce(
              (max, doc) => (doc.occurredAt > max ? doc.occurredAt : max),
              docs[0]!.occurredAt,
            )
          : undefined;

      const connection = await getIntegrationConnection(ctx, workspace._id, source);
      const secretMeta = await getActiveIntegrationSecretMetadata(ctx, workspace._id, source);
      const legacyGithub =
        source === "github" && !secretMeta
          ? await getLegacyGithubSecret(ctx, workspace._id)
          : null;

      const metadata = connection?.metadata as { lastError?: string } | undefined;
      const hasActiveSecret = Boolean(secretMeta) || Boolean(legacyGithub);
      const eventCount = Math.max(connection?.eventCount ?? 0, eventCountFromEvents);
      const lastEventAt = connection?.lastEventAt ?? lastEventFromEvents;

      entries.push({
        source,
        status: deriveExternalStatus({
          connectionStatus: connection?.status,
          hasActiveSecret,
          lastError: metadata?.lastError,
          hasEvents: eventCount > 0,
        }),
        eventCount,
        primaryEventCount,
        lastEventAt,
        lastError: metadata?.lastError,
        hasActiveSecret,
        secretLast4: secretMeta?.secretLast4 ?? legacyGithub?.last4,
        connectionId: connection?._id ?? secretMeta?.connectionId,
      });
    }

    return entries;
  },
});
