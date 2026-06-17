import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  getMembershipAndAccessible,
  requireWorkspaceRole,
} from "./lib/authz";
import {
  assertIncidentRead,
  assertIncidentWrite,
  assertObservabilitySignalRead,
} from "./lib/incidentPermissions";
import {
  createIncidentDoc,
  docToIncident,
  linkIncidentToDecisionDoc,
  linkIncidentToEventDoc,
  linkIncidentToRollbackDoc,
  linkIncidentToWorkstreamDoc,
  listIncidentsForWorkspace,
  markInvestigatingDoc,
  markMitigatedDoc,
  markResolvedDoc,
  updateIncidentStatusDoc,
} from "./lib/incidentsLib";
import {
  docToObservabilitySignal,
  listObservabilitySignalsForWorkspace,
} from "./lib/observabilitySignalsLib";
import {
  createRollbackEventDoc,
  docToRollback,
  listRollbacksForIncident,
} from "./lib/rollbackEventsLib";
import {
  incidentSeverityValidator,
  incidentSourceRefValidator,
  incidentStatusValidator,
} from "./lib/validators";
import { getWorkspaceDocByExternalId } from "./lib/workspacesLib";

export const createManualIncident = mutation({
  args: {
    workspaceId: v.string(),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    title: v.string(),
    summary: v.optional(v.string()),
    severity: incidentSeverityValidator,
    service: v.optional(v.string()),
    environment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
    ]);
    await assertIncidentWrite(ctx, args.workspaceId, userId, args.projectId);

    const doc = await createIncidentDoc(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      title: args.title,
      summary: args.summary,
      severity: args.severity,
      source: "manual",
      service: args.service,
      environment: args.environment,
    });
    return docToIncident(doc);
  },
});

export const listIncidents = query({
  args: {
    workspaceId: v.string(),
    status: v.optional(incidentStatusValidator),
    severity: v.optional(incidentSeverityValidator),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceId);
    if (!workspace) return [];
    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      userId,
    );
    if (membership.role === "auditor") return [];

    return listIncidentsForWorkspace(ctx, workspace._id, accessible, membership.role, {
      status: args.status,
      severity: args.severity,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      limit: args.limit,
    });
  },
});

export const getIncident = query({
  args: {
    workspaceId: v.string(),
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.incidentId);
    if (!doc) return null;
    await assertIncidentRead(ctx, args.workspaceId, userId, doc);
    const rollbacks = await listRollbacksForIncident(ctx, doc.linkedRollbackIds);
    return { incident: docToIncident(doc), rollbacks };
  },
});

export const updateIncidentStatus = mutation({
  args: {
    workspaceId: v.string(),
    incidentId: v.id("incidents"),
    status: incidentStatusValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.incidentId);
    if (!doc) throw new Error("Incident not found");
    await assertIncidentWrite(ctx, args.workspaceId, userId, doc.projectId);
    const updated = await updateIncidentStatusDoc(ctx, args.incidentId, args.status);
    return docToIncident(updated);
  },
});

export const archiveIncident = mutation({
  args: {
    workspaceId: v.string(),
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.incidentId);
    if (!doc) throw new Error("Incident not found");
    await assertIncidentWrite(ctx, args.workspaceId, userId, doc.projectId);
    const updated = await updateIncidentStatusDoc(ctx, args.incidentId, "archived");
    return docToIncident(updated);
  },
});

export const linkIncidentToWorkstream = mutation({
  args: {
    workspaceId: v.string(),
    incidentId: v.id("incidents"),
    workstreamId: v.id("workstreams"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.incidentId);
    if (!doc) throw new Error("Incident not found");
    await assertIncidentWrite(ctx, args.workspaceId, userId, doc.projectId);
    const updated = await linkIncidentToWorkstreamDoc(ctx, args.incidentId, args.workstreamId);
    return docToIncident(updated);
  },
});

export const linkIncidentToDecision = mutation({
  args: {
    workspaceId: v.string(),
    incidentId: v.id("incidents"),
    decisionId: v.id("decisions"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.incidentId);
    if (!doc) throw new Error("Incident not found");
    await assertIncidentWrite(ctx, args.workspaceId, userId, doc.projectId);
    const updated = await linkIncidentToDecisionDoc(ctx, args.incidentId, args.decisionId);
    return docToIncident(updated);
  },
});

export const linkIncidentToEvent = mutation({
  args: {
    workspaceId: v.string(),
    incidentId: v.id("incidents"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.incidentId);
    if (!doc) throw new Error("Incident not found");
    await assertIncidentWrite(ctx, args.workspaceId, userId, doc.projectId);
    const updated = await linkIncidentToEventDoc(ctx, args.incidentId, args.eventId);
    return docToIncident(updated);
  },
});

export const listObservabilitySignals = query({
  args: {
    workspaceId: v.string(),
    incidentId: v.optional(v.id("incidents")),
    severity: v.optional(incidentSeverityValidator),
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceId);
    if (!workspace) return [];
    const { membership, accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      userId,
    );
    if (membership.role === "auditor") return [];

    return listObservabilitySignalsForWorkspace(ctx, workspace._id, accessible, membership.role, {
      incidentId: args.incidentId,
      severity: args.severity,
      projectId: args.projectId,
      limit: args.limit,
    });
  },
});

export const getObservabilitySignal = query({
  args: {
    workspaceId: v.string(),
    signalId: v.id("observabilitySignals"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.signalId);
    if (!doc) return null;
    await assertObservabilitySignalRead(ctx, args.workspaceId, userId, doc);
    return docToObservabilitySignal(doc);
  },
});

export const createIncidentRollback = mutation({
  args: {
    workspaceId: v.string(),
    incidentId: v.id("incidents"),
    title: v.string(),
    summary: v.optional(v.string()),
    reason: v.optional(v.string()),
    sourceRef: v.optional(incidentSourceRefValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) throw new Error("Incident not found");
    await assertIncidentWrite(ctx, args.workspaceId, userId, incident.projectId);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const rollback = await createRollbackEventDoc(ctx, {
      workspaceId: workspace._id,
      projectId: incident.projectId,
      workstreamId: incident.workstreamId,
      title: args.title,
      summary: args.summary,
      reason: args.reason,
      source: "manual",
      sourceRef: args.sourceRef,
    });
    await linkIncidentToRollbackDoc(ctx, args.incidentId, rollback._id);
    await updateIncidentStatusDoc(ctx, args.incidentId, "rolled_back");
    return docToRollback(rollback);
  },
});

export const markInvestigating = mutation({
  args: {
    workspaceId: v.string(),
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.incidentId);
    if (!doc) throw new Error("Incident not found");
    await assertIncidentWrite(ctx, args.workspaceId, userId, doc.projectId);
    const updated = await markInvestigatingDoc(ctx, args.incidentId);
    return docToIncident(updated);
  },
});

export const markMitigated = mutation({
  args: {
    workspaceId: v.string(),
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.incidentId);
    if (!doc) throw new Error("Incident not found");
    await assertIncidentWrite(ctx, args.workspaceId, userId, doc.projectId);
    const updated = await markMitigatedDoc(ctx, args.incidentId);
    return docToIncident(updated);
  },
});

export const markResolved = mutation({
  args: {
    workspaceId: v.string(),
    incidentId: v.id("incidents"),
    rootCause: v.optional(v.string()),
    mitigation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.incidentId);
    if (!doc) throw new Error("Incident not found");
    await assertIncidentWrite(ctx, args.workspaceId, userId, doc.projectId);
    const updated = await markResolvedDoc(ctx, args.incidentId, {
      rootCause: args.rootCause,
      mitigation: args.mitigation,
    });
    return docToIncident(updated);
  },
});
