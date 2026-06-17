import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireUserId } from "../lib/auth";
import { requireWorkspaceRole } from "../lib/authz";
import { insertEvent } from "../lib/eventsLib";
import {
  getActiveIntegrationSecretForServer,
  getActiveIntegrationSecretMetadata,
  getIntegrationConnection,
  revokeIntegrationSecret,
  saveEncryptedIntegrationSecret,
  setIntegrationConnectionError,
  updateIntegrationStatus,
} from "../lib/integrationSharedLib";
import { parseObservabilityConfig } from "../lib/integrations/observabilityCaptureRules";
import { inferAndApplyIncidentLinks } from "../lib/incidentLinking";
import {
  createIncidentDoc,
  findIncidentByDedupKey,
  linkIncidentToRollbackDoc,
  linkIncidentToSignalDoc,
  transitionIncidentStatusDoc,
} from "../lib/incidentsLib";
import {
  recordDeployTimelineEvent,
  recordRollbackObservabilityEvent,
  recordServiceHealthTimelineEvent,
} from "../lib/incidentTimeline";
import {
  createObservabilitySignalDoc,
  linkObservabilitySignalToEventDoc,
} from "../lib/observabilitySignalsLib";
import type { NormalizedObservabilitySignal } from "../lib/observabilityNormalization";
import { createRollbackEventDoc } from "../lib/rollbackEventsLib";
import { getWorkspaceDocByExternalId } from "../lib/workspacesLib";
import type { Doc, Id } from "../_generated/dataModel";

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

function shouldOpenIncident(signal: NormalizedObservabilitySignal): boolean {
  if (
    signal.signalType === "incident_opened" ||
    signal.signalType === "service_degraded"
  ) {
    return true;
  }
  if (
    (signal.signalType === "error" || signal.signalType === "alert") &&
    (signal.severity === "critical" || signal.severity === "error") &&
    Boolean(signal.fingerprint)
  ) {
    return true;
  }
  return false;
}

function shouldResolveIncident(signal: NormalizedObservabilitySignal): boolean {
  return (
    signal.signalType === "incident_resolved" ||
    signal.signalType === "service_recovered" ||
    signal.signalType === "rollback_completed"
  );
}

function incidentStatusForResolveSignal(
  signalType: NormalizedObservabilitySignal["signalType"],
): Doc<"incidents">["status"] {
  if (signalType === "rollback_completed") return "rolled_back";
  return "resolved";
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
      throw new Error("Observability signing secret is too short");
    }

    const { last4 } = await saveEncryptedIntegrationSecret(ctx, {
      workspaceId: workspace._id,
      source: "observability",
      connectionName: "Observability",
      secretName: "Observability signing secret",
      rawSecret,
      createdBy: buildCreatedBy(membership),
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "other",
      category: "system_event",
      type: "integration.secret_saved",
      actor: { type: "human", name: membership.name ?? "Owner", id: membership.clerkUserId },
      title: "Observability signing secret saved",
      summary: "Encrypted observability signing secret configured.",
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
      source: "observability",
      connectionName: "Observability",
    });
    return { ok: true };
  },
});

export const saveObservabilityConfig = mutation({
  args: {
    workspaceId: v.string(),
    allowedServices: v.optional(v.array(v.string())),
    allowedEnvironments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin"]);
    const connection = await getIntegrationConnection(ctx, workspace._id, "observability");
    if (!connection) {
      throw new Error("Configure observability signing secret first");
    }
    const metadata = {
      ...(connection.metadata as Record<string, unknown> | undefined),
      allowedServices: args.allowedServices?.map((s) => s.trim()).filter(Boolean),
      allowedEnvironments: args.allowedEnvironments?.map((s) => s.trim()).filter(Boolean),
    };
    await ctx.db.patch(connection._id, { metadata, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const getObservabilityStatus = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceId);
    if (!workspace) return null;

    const secretMeta = await getActiveIntegrationSecretMetadata(ctx, workspace._id, "observability");
    const connection = await getIntegrationConnection(ctx, workspace._id, "observability");
    const metadata = parseObservabilityConfig(connection?.metadata);
    const connMeta = connection?.metadata as Record<string, unknown> | undefined;

    return {
      connected: Boolean(secretMeta),
      secretLast4: secretMeta?.secretLast4,
      maskedSecret: secretMeta?.maskedSecret,
      allowedServices: metadata.allowedServices,
      allowedEnvironments: metadata.allowedEnvironments,
      lastError: connMeta?.lastError as string | undefined,
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

    const secret = await getActiveIntegrationSecretForServer(ctx, workspace._id, "observability");
    const connection = await getIntegrationConnection(ctx, workspace._id, "observability");
    const config = parseObservabilityConfig(connection?.metadata);

    return {
      encryptedSecret: secret?.encryptedSecret,
      config,
    };
  },
});

export const recordObservabilityWebhookError = mutation({
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
    await setIntegrationConnectionError(
      ctx,
      workspace._id,
      "observability",
      "Observability",
      args.error,
    );
    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "other",
      category: "system_event",
      type: "integration.webhook_error",
      actor: { type: "system", name: "Observability" },
      title: "Observability webhook error",
      summary: args.error,
      visibility: "debug",
      importance: args.importance ?? "normal",
    });
  },
});

export const processObservabilitySideEffects = internalMutation({
  args: {
    workspaceExternalId: v.string(),
    normalized: v.any(),
    timelineEventId: v.optional(v.id("events")),
    duplicate: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.duplicate) return { skipped: true as const };

    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);
    if (!workspace) return { skipped: true as const };

    const normalized = args.normalized as NormalizedObservabilitySignal;
    const signal = await createObservabilitySignalDoc(ctx, {
      workspaceId: workspace._id,
      source: normalized.source,
      signalType: normalized.signalType,
      severity: normalized.severity,
      title: normalized.title,
      summary: normalized.summary,
      service: normalized.service,
      environment: normalized.environment,
      region: normalized.region,
      fingerprint: normalized.fingerprint,
      sourceSignalId: normalized.sourceSignalId,
      sourceUrl: normalized.sourceUrl,
      occurredAt: normalized.occurredAt,
      metadata: normalized.metadata,
    });

    if (args.timelineEventId) {
      await linkObservabilitySignalToEventDoc(ctx, signal._id, args.timelineEventId);
    }

    let incidentId: Id<"incidents"> | undefined = signal.incidentId;

    if (shouldOpenIncident(normalized)) {
      const sourceRef = {
        provider: normalized.source,
        sourceIncidentId: normalized.sourceSignalId,
        sourceUrl: normalized.sourceUrl,
        fingerprint: normalized.fingerprint,
      };
      const existing = await findIncidentByDedupKey(ctx, {
        workspaceId: workspace._id,
        source: normalized.source === "sentry" || normalized.source === "datadog"
          ? normalized.source
          : "generic",
        sourceIncidentId: sourceRef.sourceIncidentId,
        service: normalized.service,
        fingerprint: sourceRef.fingerprint,
      });

      const incident = existing
        ? existing
        : await createIncidentDoc(ctx, {
            workspaceId: workspace._id,
            title: normalized.title,
            summary: normalized.summary,
            severity: normalized.severity,
            source:
              normalized.source === "sentry" || normalized.source === "datadog"
                ? normalized.source
                : normalized.source === "cli"
                  ? "cli"
                  : normalized.source === "mcp"
                    ? "mcp"
                    : normalized.source === "system"
                      ? "system"
                      : "generic",
            service: normalized.service,
            environment: normalized.environment,
            startedAt: normalized.occurredAt,
            sourceRef,
          });

      incidentId = incident._id;
      await ctx.db.patch(signal._id, { incidentId, updatedAt: Date.now() });
      await linkIncidentToSignalDoc(ctx, incidentId, signal._id);
    } else if (shouldResolveIncident(normalized)) {
      const existing = await findIncidentByDedupKey(ctx, {
        workspaceId: workspace._id,
        source: normalized.source === "sentry" || normalized.source === "datadog"
          ? normalized.source
          : "generic",
        sourceIncidentId: normalized.sourceSignalId,
        service: normalized.service,
        fingerprint: normalized.fingerprint,
      });
      if (existing) {
        incidentId = existing._id;
        const nextStatus = incidentStatusForResolveSignal(normalized.signalType);
        await transitionIncidentStatusDoc(ctx, existing._id, nextStatus, {
          resolvedAt: normalized.occurredAt,
        });
        await ctx.db.patch(signal._id, { incidentId, updatedAt: Date.now() });
        await linkIncidentToSignalDoc(ctx, incidentId, signal._id);
      }
    }

    if (
      normalized.signalType === "deploy_started" ||
      normalized.signalType === "deploy_succeeded" ||
      normalized.signalType === "deploy_failed"
    ) {
      const eventId = await recordDeployTimelineEvent(ctx, {
        workspaceId: workspace._id,
        signalId: signal._id,
        incidentId,
        title: normalized.title,
        summary: normalized.summary,
        source: normalized.source,
        signalType: normalized.signalType as "deploy_started" | "deploy_succeeded" | "deploy_failed",
        severity: normalized.severity,
        occurredAt: normalized.occurredAt,
      });
      await linkObservabilitySignalToEventDoc(ctx, signal._id, eventId);
    }

    if (
      normalized.signalType === "rollback_started" ||
      normalized.signalType === "rollback_completed"
    ) {
      let rollbackId: Id<"rollbackEvents"> | undefined;
      if (normalized.signalType === "rollback_completed") {
        const rollback = await createRollbackEventDoc(ctx, {
          workspaceId: workspace._id,
          title: normalized.title,
          summary: normalized.summary,
          reason: normalized.summary,
          source: "manual",
          sourceRef: {
            provider: normalized.source,
            sourceSignalId: normalized.sourceSignalId,
            fingerprint: normalized.fingerprint,
          },
        });
        rollbackId = rollback._id;
        if (incidentId) {
          await linkIncidentToRollbackDoc(ctx, incidentId, rollbackId);
        }
      }

      const eventId = await recordRollbackObservabilityEvent(ctx, {
        workspaceId: workspace._id,
        signalId: signal._id,
        incidentId,
        rollbackId,
        title: normalized.title,
        summary: normalized.summary,
        source: normalized.source,
        signalType: normalized.signalType as "rollback_started" | "rollback_completed",
        severity: normalized.severity,
        occurredAt: normalized.occurredAt,
      });
      await linkObservabilitySignalToEventDoc(ctx, signal._id, eventId);
    }

    if (
      normalized.signalType === "service_degraded" ||
      normalized.signalType === "service_recovered"
    ) {
      const eventId = await recordServiceHealthTimelineEvent(ctx, {
        workspaceId: workspace._id,
        signalId: signal._id,
        incidentId,
        title: normalized.title,
        summary: normalized.summary,
        source: normalized.source,
        signalType: normalized.signalType as "service_degraded" | "service_recovered",
        severity: normalized.severity,
        service: normalized.service,
        occurredAt: normalized.occurredAt,
      });
      await linkObservabilitySignalToEventDoc(ctx, signal._id, eventId);
    }

    if (incidentId) {
      await inferAndApplyIncidentLinks(ctx, incidentId, signal._id);
    }

    await updateIntegrationStatus(ctx, workspace._id, "observability", Date.now());

    return {
      signalId: signal._id,
      incidentId,
      duplicate: false as const,
    };
  },
});

export const sendTestEvent = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin"]);
    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "other",
      category: "system_event",
      type: "observability.test_event",
      actor: { type: "system", name: "Observability" },
      title: "Observability test event",
      summary: "Test event from Sortiri observability integration.",
      visibility: "primary",
      importance: "normal",
    });
    await updateIntegrationStatus(ctx, workspace._id, "observability", Date.now());
    return { ok: true };
  },
});
