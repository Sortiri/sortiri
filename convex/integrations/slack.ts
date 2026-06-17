import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireUserId } from "../lib/auth";
import { requireWorkspaceRole } from "../lib/authz";
import { insertEvent } from "../lib/eventsLib";
import {
  createDecisionCandidateDoc,
} from "../lib/decisionCandidatesLib";
import { createRollbackEventDoc } from "../lib/rollbackEventsLib";
import {
  extractDecisionCandidateFromText,
  extractRollbackFromText,
} from "../lib/decisionExtraction";
import {
  getActiveIntegrationSecretForServer,
  getActiveIntegrationSecretMetadata,
  getIntegrationConnection,
  revokeIntegrationSecret,
  saveEncryptedIntegrationSecret,
  setIntegrationConnectionError,
  updateIntegrationStatus,
} from "../lib/integrationSharedLib";
import { parseSlackConfig } from "../lib/integrations/slackCaptureRules";
import { maskSecretForSource } from "../lib/secretsLib";
import { slackCaptureModeValidator } from "../lib/validators";
import { getWorkspaceDocByExternalId } from "../lib/workspacesLib";
import type { SlackStatus } from "../../src/types/slack-integration";

function validateIntegrationServerKey(serverKey: string): void {
  const expected = process.env.SORTIRI_INTEGRATION_SERVER_KEY;
  if (!expected || serverKey !== expected) {
    throw new Error("Unauthorized");
  }
}

function buildCreatedBy(membership: {
  clerkUserId: string;
  email?: string;
  name?: string;
}) {
  return {
    clerkUserId: membership.clerkUserId,
    email: membership.email,
    name: membership.name,
  };
}

export const saveSigningSecret = mutation({
  args: {
    workspaceId: v.string(),
    rawSecret: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const { workspace, membership } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const rawSecret = args.rawSecret.trim();
    if (rawSecret.length < 8) {
      throw new Error("Slack signing secret is too short");
    }

    const { last4 } = await saveEncryptedIntegrationSecret(ctx, {
      workspaceId: workspace._id,
      source: "slack",
      connectionName: "Slack",
      secretName: "Slack signing secret",
      rawSecret,
      createdBy: buildCreatedBy(membership),
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "slack",
      category: "system_event",
      type: "integration.secret_saved",
      actor: { type: "human", name: membership.name ?? "Owner", id: membership.clerkUserId },
      title: "Slack signing secret saved",
      summary: "Encrypted Slack signing secret configured.",
      visibility: "primary",
      importance: "normal",
    });

    return { last4 };
  },
});

export const revokeSigningSecret = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin"]);
    await revokeIntegrationSecret(ctx, {
      workspaceId: workspace._id,
      source: "slack",
      connectionName: "Slack",
    });
    return { ok: true };
  },
});

export const saveSlackConfig = mutation({
  args: {
    workspaceId: v.string(),
    captureMode: slackCaptureModeValidator,
    allowedChannelIds: v.optional(v.array(v.string())),
    allowedChannelNames: v.optional(v.array(v.string())),
    decisionReactionEmojis: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin"]);
    const connection = await getIntegrationConnection(ctx, workspace._id, "slack");
    if (!connection) {
      throw new Error("Configure Slack signing secret first");
    }
    const metadata = {
      ...(connection.metadata as Record<string, unknown> | undefined),
      captureMode: args.captureMode,
      allowedChannelIds: args.allowedChannelIds,
      allowedChannelNames: args.allowedChannelNames,
      decisionReactionEmojis: args.decisionReactionEmojis,
    };
    await ctx.db.patch(connection._id, { metadata, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const getSlackStatus = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args): Promise<SlackStatus> => {
    await requireUserId(ctx);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceId);
    if (!workspace) {
      return { connected: false, captureMode: "manual_mentions_only" };
    }

    const secretMeta = await getActiveIntegrationSecretMetadata(ctx, workspace._id, "slack");
    const connection = await getIntegrationConnection(ctx, workspace._id, "slack");
    const metadata = parseSlackConfig(connection?.metadata);
    const connMeta = connection?.metadata as { lastError?: string } | undefined;

    return {
      connected: Boolean(secretMeta),
      maskedSecret: secretMeta
        ? maskSecretForSource(secretMeta.secretLast4, "slack")
        : undefined,
      captureMode: metadata.captureMode,
      allowedChannelIds: metadata.allowedChannelIds,
      allowedChannelNames: metadata.allowedChannelNames,
      lastError: connMeta?.lastError,
      eventCount: connection?.eventCount,
      lastEventAt: connection?.lastEventAt,
    };
  },
});

export const getWebhookSecretForVerification = query({
  args: {
    workspaceExternalId: v.string(),
    serverKey: v.string(),
  },
  handler: async (ctx, args) => {
    validateIntegrationServerKey(args.serverKey);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
    if (!workspace) return null;

    const secret = await getActiveIntegrationSecretForServer(ctx, workspace._id, "slack");
    const connection = await getIntegrationConnection(ctx, workspace._id, "slack");
    const config = parseSlackConfig(connection?.metadata);

    return {
      encryptedSecret: secret?.encryptedSecret,
      config,
    };
  },
});

export const recordSlackWebhookError = mutation({
  args: {
    serverKey: v.string(),
    workspaceExternalId: v.string(),
    error: v.string(),
    importance: v.optional(v.union(v.literal("normal"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    validateIntegrationServerKey(args.serverKey);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
    if (!workspace) return;
    await setIntegrationConnectionError(ctx, workspace._id, "slack", "Slack", args.error);
    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "slack",
      category: "system_event",
      type: "integration.webhook_error",
      actor: { type: "system", name: "Slack" },
      title: "Slack webhook error",
      summary: args.error,
      visibility: "debug",
      importance: args.importance ?? "normal",
    });
  },
});

export const processSlackDecisionSideEffects = internalMutation({
  args: {
    workspaceExternalId: v.string(),
    text: v.string(),
    channelId: v.optional(v.string()),
    messageTs: v.optional(v.string()),
    threadTs: v.optional(v.string()),
    sourceEventId: v.string(),
    isDecisionCandidate: v.boolean(),
    isRollback: v.boolean(),
  },
  handler: async (ctx, args) => {
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
    if (!workspace) return;

    const sourceRef = {
      provider: "slack",
      channelId: args.channelId,
      messageTs: args.messageTs,
      threadTs: args.threadTs,
      sourceEventId: args.sourceEventId,
    };

    if (args.isRollback) {
      const rollback = extractRollbackFromText(args.text);
      if (rollback) {
        await createRollbackEventDoc(ctx, {
          workspaceId: workspace._id,
          title: rollback.title,
          summary: rollback.summary,
          reason: rollback.reason,
          source: "slack",
          sourceRef,
        });
      }
      return;
    }

    if (args.isDecisionCandidate) {
      const extracted = extractDecisionCandidateFromText(args.text);
      if (extracted) {
        await createDecisionCandidateDoc(ctx, {
          workspaceId: workspace._id,
          source: "slack",
          confidence: extracted.confidence,
          title: extracted.title,
          summary: extracted.summary,
          rawText: args.text,
          sourceRef,
          extractedSignals: extracted.signals,
          suggestedDecisionType: extracted.decisionType,
          suggestedEntities: extracted.entities,
          suggestedTags: extracted.tags,
        });
      }
    }
  },
});

export const sendTestEvent = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin"]);
    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "slack",
      category: "system_event",
      type: "slack.test_event",
      actor: { type: "system", name: "Slack" },
      title: "Slack test event",
      summary: "Test event from Sortiri Slack integration.",
      visibility: "primary",
      importance: "normal",
    });
    await updateIntegrationStatus(ctx, workspace._id, "slack", Date.now());
    return { ok: true };
  },
});
