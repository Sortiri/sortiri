import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveIngestWorkspace } from "./lib/ingestAuth";
import {
  assertNotAuditorWorkspaceBrowse,
  canWriteWorkspaceData,
  getMembershipAndAccessible,
} from "./lib/authz";
import {
  createIncidentDoc,
  docToIncident,
  linkIncidentToDecisionDoc,
  linkIncidentToRollbackDoc,
  linkIncidentToWorkstreamDoc,
  listIncidentsForWorkspace,
  resolveIncidentDoc,
  updateIncidentStatusDoc,
} from "./lib/incidentsLib";
import { listObservabilitySignalsForWorkspace } from "./lib/observabilitySignalsLib";
import {
  createRollbackEventDoc,
  docToRollback,
} from "./lib/rollbackEventsLib";
import {
  incidentSeverityValidator,
  incidentSourceRefValidator,
  incidentStatusValidator,
} from "./lib/validators";

const ingestAuthArgs = {
  ingestKey: v.optional(v.string()),
  apiKeyId: v.optional(v.id("apiKeys")),
  workspaceId: v.string(),
};

async function resolveIngestActor(
  ctx: Parameters<typeof getMembershipAndAccessible>[0],
  workspaceId: import("./_generated/dataModel").Id<"workspaces">,
  apiKeyId?: import("./_generated/dataModel").Id<"apiKeys">,
) {
  if (apiKeyId) {
    const apiKey = await ctx.db.get(apiKeyId);
    if (apiKey?.createdBy) {
      return {
        clerkUserId: apiKey.createdBy.userId ?? "api-key-agent",
        name: apiKey.createdBy.name ?? "Cursor Agent",
        email: apiKey.createdBy.email,
        type: "agent" as const,
      };
    }
  }
  const workspace = await ctx.db.get(workspaceId);
  return {
    clerkUserId: workspace?.userId ?? "api-key-agent",
    name: "Cursor Agent",
    email: undefined as string | undefined,
    type: "agent" as const,
  };
}

export const recordIncident = mutation({
  args: {
    ...ingestAuthArgs,
    title: v.string(),
    summary: v.optional(v.string()),
    severity: incidentSeverityValidator,
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    service: v.optional(v.string()),
    environment: v.optional(v.string()),
    sourceRef: v.optional(incidentSourceRefValidator),
    startedAt: v.optional(v.number()),
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

    const doc = await createIncidentDoc(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      title: args.title,
      summary: args.summary,
      severity: args.severity,
      source: "cli",
      service: args.service,
      environment: args.environment,
      sourceRef: args.sourceRef,
      startedAt: args.startedAt,
    });
    return docToIncident(doc);
  },
});

export const listIncidents = query({
  args: {
    ...ingestAuthArgs,
    status: v.optional(incidentStatusValidator),
    severity: v.optional(incidentSeverityValidator),
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
    return listIncidentsForWorkspace(ctx, workspace._id, accessible, membership.role, {
      status: args.status,
      severity: args.severity,
      limit: args.limit,
    });
  },
});

export const getIncident = query({
  args: {
    ...ingestAuthArgs,
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const doc = await ctx.db.get(args.incidentId);
    if (!doc || doc.workspaceId !== workspace._id) throw new Error("Incident not found");
    return docToIncident(doc);
  },
});

export const resolveIncident = mutation({
  args: {
    ...ingestAuthArgs,
    incidentId: v.id("incidents"),
    rootCause: v.optional(v.string()),
    mitigation: v.optional(v.string()),
    rollbackSummary: v.optional(v.string()),
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

    const doc = await ctx.db.get(args.incidentId);
    if (!doc || doc.workspaceId !== workspace._id) throw new Error("Incident not found");
    const updated = await resolveIncidentDoc(ctx, args.incidentId, {
      rootCause: args.rootCause,
      mitigation: args.mitigation,
      rollbackSummary: args.rollbackSummary,
    });
    return docToIncident(updated);
  },
});

export const createRollback = mutation({
  args: {
    ...ingestAuthArgs,
    incidentId: v.id("incidents"),
    title: v.string(),
    summary: v.optional(v.string()),
    reason: v.optional(v.string()),
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

    const incident = await ctx.db.get(args.incidentId);
    if (!incident || incident.workspaceId !== workspace._id) {
      throw new Error("Incident not found");
    }

    const rollback = await createRollbackEventDoc(ctx, {
      workspaceId: workspace._id,
      projectId: incident.projectId,
      workstreamId: incident.workstreamId,
      title: args.title,
      summary: args.summary,
      reason: args.reason,
      source: "cli",
    });
    await linkIncidentToRollbackDoc(ctx, args.incidentId, rollback._id);
    await updateIncidentStatusDoc(ctx, args.incidentId, "rolled_back");
    return docToRollback(rollback);
  },
});

export const listObservabilitySignals = query({
  args: {
    ...ingestAuthArgs,
    incidentId: v.optional(v.id("incidents")),
    severity: v.optional(incidentSeverityValidator),
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
    return listObservabilitySignalsForWorkspace(ctx, workspace._id, accessible, membership.role, {
      incidentId: args.incidentId,
      severity: args.severity,
      limit: args.limit,
    });
  },
});

export const linkToWorkstream = mutation({
  args: {
    ...ingestAuthArgs,
    incidentId: v.id("incidents"),
    workstreamId: v.id("workstreams"),
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

    const doc = await ctx.db.get(args.incidentId);
    if (!doc || doc.workspaceId !== workspace._id) throw new Error("Incident not found");
    const updated = await linkIncidentToWorkstreamDoc(ctx, args.incidentId, args.workstreamId);
    return docToIncident(updated);
  },
});

export const linkToDecision = mutation({
  args: {
    ...ingestAuthArgs,
    incidentId: v.id("incidents"),
    decisionId: v.id("decisions"),
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

    const doc = await ctx.db.get(args.incidentId);
    if (!doc || doc.workspaceId !== workspace._id) throw new Error("Incident not found");
    const updated = await linkIncidentToDecisionDoc(ctx, args.incidentId, args.decisionId);
    return docToIncident(updated);
  },
});
