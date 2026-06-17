import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireUserId } from "../lib/auth";
import { assertWorkspaceBrowseAccess } from "../lib/eventsLib";
import {
  getIntegrationConnection,
} from "../lib/integrationSharedLib";
import { getActiveIntegrationSecretMetadata } from "../lib/integrationSharedLib";
import {
  aggregateDeliveryHealth,
} from "../lib/ingestReliabilityLib";
import { listDeliveriesForWorkspace } from "../lib/ingestDeliveryLib";
import { listDeadLettersForWorkspace } from "../lib/ingestDeadLetterLib";
import { getActiveSecretForWorkspace as getLegacyGithubSecret } from "../lib/githubWebhookSecretsLib";

const EXTERNAL_SOURCES = ["github", "stripe", "posthog", "slack", "observability"] as const;
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
    | "slack"
    | "observability"
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
  deliveryHealth?: "healthy" | "degraded" | "error";
  deliveriesLast24h?: number;
  retryPending?: number;
  deadLetters?: number;
  duplicates?: number;
  lastSuccessfulDeliveryAt?: number;
  lastFailedDeliveryAt?: number;
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

function mapDeliveryHealth(
  meta?: {
    health: "healthy" | "degraded" | "error";
    deliveriesLast24h: number;
    retryPending: number;
    deadLetters: number;
    duplicates: number;
    lastSuccessfulAt?: number;
    lastFailedAt?: number;
  },
) {
  if (!meta) return {};
  return {
    deliveryHealth: meta.health,
    deliveriesLast24h: meta.deliveriesLast24h,
    retryPending: meta.retryPending,
    deadLetters: meta.deadLetters,
    duplicates: meta.duplicates,
    lastSuccessfulDeliveryAt: meta.lastSuccessfulAt,
    lastFailedDeliveryAt: meta.lastFailedAt,
  };
}

export const getSourceHealth = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<SourceHealthEntry[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);

    const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
    const deliveries = await listDeliveriesForWorkspace(ctx, workspace._id, {
      limit: 500,
    });
    const deadLetters = await listDeadLettersForWorkspace(ctx, workspace._id, {
      status: "open",
      limit: 500,
    });
    const deadLetterCountBySource: Record<string, number> = {};
    for (const dl of deadLetters) {
      deadLetterCountBySource[dl.source] =
        (deadLetterCountBySource[dl.source] ?? 0) + 1;
    }
    const deliveryHealthBySource = aggregateDeliveryHealth(
      deliveries.map((d) => ({
        source: d.source,
        status: d.status,
        receivedAt: d.receivedAt,
        updatedAt: d.updatedAt,
      })),
      deadLetterCountBySource,
      sinceMs,
    );

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
        ...mapDeliveryHealth(deliveryHealthBySource[source]),
      });
    }

    for (const source of EXTERNAL_SOURCES) {
      const docs =
        source === "observability"
          ? (
              await ctx.db
                .query("events")
                .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
                .collect()
            ).filter((doc) => doc.category === "observability")
          : await ctx.db
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

      const deliveryMeta = deliveryHealthBySource[source];
      const derivedStatus =
        deliveryMeta?.health === "error"
          ? "error"
          : deriveExternalStatus({
              connectionStatus: connection?.status,
              hasActiveSecret,
              lastError: metadata?.lastError,
              hasEvents: eventCount > 0,
            });

      entries.push({
        source,
        status:
          deliveryMeta?.health === "degraded" && derivedStatus === "connected"
            ? "error"
            : derivedStatus,
        eventCount,
        primaryEventCount,
        lastEventAt,
        lastError: metadata?.lastError,
        hasActiveSecret,
        secretLast4: secretMeta?.secretLast4 ?? legacyGithub?.last4,
        connectionId: connection?._id ?? secretMeta?.connectionId,
        ...mapDeliveryHealth(deliveryMeta),
      });
    }

    return entries;
  },
});
