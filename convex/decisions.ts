import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  getMembershipAndAccessible,
  requireWorkspaceRole,
} from "./lib/authz";
import {
  assertDecisionRead,
  assertDecisionWrite,
} from "./lib/decisionPermissions";
import {
  confirmDecisionCandidateDoc,
  dismissDecisionCandidateDoc,
  docToDecisionCandidate,
  filterCandidatesByAccess,
  listDecisionCandidatesForWorkspace,
} from "./lib/decisionCandidatesLib";
import {
  createDecisionDoc,
  docToDecision,
  linkDecisionToEntityDoc,
  linkDecisionToEventDoc,
  linkDecisionToWorkstreamDoc,
  listDecisionsForWorkspace,
  updateDecisionDoc,
} from "./lib/decisionsLib";
import {
  createRollbackEventDoc,
  docToRollback,
  listRollbacksForDecision,
  listRollbacksForWorkspace,
} from "./lib/rollbackEventsLib";
import {
  decidedByValidator,
  decisionSourceRefValidator,
  decisionStatusValidator,
  decisionTypeValidator,
} from "./lib/validators";
import { getWorkspaceDocByExternalId } from "./lib/workspacesLib";

export const createManualDecision = mutation({
  args: {
    workspaceId: v.string(),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    title: v.string(),
    summary: v.optional(v.string()),
    decisionType: decisionTypeValidator,
    rationale: v.optional(v.string()),
    expectedOutcome: v.optional(v.string()),
    rollbackPlan: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const { workspace, membership } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
    ]);
    await assertDecisionWrite(ctx, args.workspaceId, userId, args.projectId);

    const doc = await createDecisionDoc(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      title: args.title,
      summary: args.summary,
      decisionType: args.decisionType,
      source: "manual",
      rationale: args.rationale,
      expectedOutcome: args.expectedOutcome,
      rollbackPlan: args.rollbackPlan,
      tags: args.tags,
      decidedBy: {
        clerkUserId: userId,
        name: membership.name,
        email: membership.email,
        type: "human",
      },
    });
    return docToDecision(doc);
  },
});

export const listDecisions = query({
  args: {
    workspaceId: v.string(),
    status: v.optional(decisionStatusValidator),
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

    return listDecisionsForWorkspace(ctx, workspace._id, accessible, membership.role, {
      status: args.status,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      limit: args.limit,
    });
  },
});

export const getDecision = query({
  args: {
    workspaceId: v.string(),
    decisionId: v.id("decisions"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.decisionId);
    if (!doc) return null;
    await assertDecisionRead(ctx, args.workspaceId, userId, doc);
    const rollbacks = await listRollbacksForDecision(ctx, args.decisionId);
    return { decision: docToDecision(doc), rollbacks };
  },
});

export const updateDecision = mutation({
  args: {
    workspaceId: v.string(),
    decisionId: v.id("decisions"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.optional(decisionStatusValidator),
    decisionType: v.optional(decisionTypeValidator),
    rationale: v.optional(v.string()),
    expectedOutcome: v.optional(v.string()),
    rollbackPlan: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.decisionId);
    if (!doc) throw new Error("Decision not found");
    await assertDecisionWrite(ctx, args.workspaceId, userId, doc.projectId);

    const updated = await updateDecisionDoc(ctx, args.decisionId, {
      title: args.title,
      summary: args.summary,
      status: args.status,
      decisionType: args.decisionType,
      rationale: args.rationale,
      expectedOutcome: args.expectedOutcome,
      rollbackPlan: args.rollbackPlan,
      tags: args.tags,
    });
    return docToDecision(updated);
  },
});

export const archiveDecision = mutation({
  args: {
    workspaceId: v.string(),
    decisionId: v.id("decisions"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.decisionId);
    if (!doc) throw new Error("Decision not found");
    await assertDecisionWrite(ctx, args.workspaceId, userId, doc.projectId);
    const updated = await updateDecisionDoc(ctx, args.decisionId, { status: "archived" });
    return docToDecision(updated);
  },
});

export const linkDecisionToWorkstream = mutation({
  args: {
    workspaceId: v.string(),
    decisionId: v.id("decisions"),
    workstreamId: v.id("workstreams"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.decisionId);
    if (!doc) throw new Error("Decision not found");
    await assertDecisionWrite(ctx, args.workspaceId, userId, doc.projectId);
    const updated = await linkDecisionToWorkstreamDoc(ctx, args.decisionId, args.workstreamId);
    return docToDecision(updated);
  },
});

export const linkDecisionToEvent = mutation({
  args: {
    workspaceId: v.string(),
    decisionId: v.id("decisions"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.decisionId);
    if (!doc) throw new Error("Decision not found");
    await assertDecisionWrite(ctx, args.workspaceId, userId, doc.projectId);
    const updated = await linkDecisionToEventDoc(ctx, args.decisionId, args.eventId);
    return docToDecision(updated);
  },
});

export const linkDecisionToEntity = mutation({
  args: {
    workspaceId: v.string(),
    decisionId: v.id("decisions"),
    entityId: v.id("entities"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.decisionId);
    if (!doc) throw new Error("Decision not found");
    await assertDecisionWrite(ctx, args.workspaceId, userId, doc.projectId);
    const updated = await linkDecisionToEntityDoc(ctx, args.decisionId, args.entityId);
    return docToDecision(updated);
  },
});

export const listDecisionCandidates = query({
  args: {
    workspaceId: v.string(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("dismissed"),
      v.literal("archived"),
    )),
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

    const rows = await listDecisionCandidatesForWorkspace(ctx, workspace._id, {
      status: args.status,
      limit: args.limit,
    });
    return filterCandidatesByAccess(
      rows.map((r) => ({ ...r, projectId: r.projectId as never })),
      accessible,
      membership.role,
    ).map((r) => docToDecisionCandidate(r as never));
  },
});

export const confirmDecisionCandidate = mutation({
  args: {
    workspaceId: v.string(),
    candidateId: v.id("decisionCandidates"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const { membership } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
    ]);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("Candidate not found");
    await assertDecisionWrite(ctx, args.workspaceId, userId, candidate.projectId);

    const result = await confirmDecisionCandidateDoc(ctx, args.candidateId, {
      clerkUserId: userId,
      name: membership.name,
      email: membership.email,
      type: "human",
    });
    return {
      candidate: docToDecisionCandidate(result.candidate),
      decision: docToDecision(result.decision),
    };
  },
});

export const dismissDecisionCandidate = mutation({
  args: {
    workspaceId: v.string(),
    candidateId: v.id("decisionCandidates"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("Candidate not found");
    await assertDecisionWrite(ctx, args.workspaceId, userId, candidate.projectId);
    const updated = await dismissDecisionCandidateDoc(ctx, args.candidateId);
    return docToDecisionCandidate(updated);
  },
});

export const createRollbackEvent = mutation({
  args: {
    workspaceId: v.string(),
    decisionId: v.optional(v.id("decisions")),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    title: v.string(),
    summary: v.optional(v.string()),
    reason: v.optional(v.string()),
    sourceRef: v.optional(decisionSourceRefValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin", "member"]);
    await assertDecisionWrite(ctx, args.workspaceId, userId, args.projectId);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const doc = await createRollbackEventDoc(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      decisionId: args.decisionId,
      title: args.title,
      summary: args.summary,
      reason: args.reason,
      source: "manual",
      sourceRef: args.sourceRef,
    });
    return docToRollback(doc);
  },
});

export const listRollbacks = query({
  args: {
    workspaceId: v.string(),
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
    return listRollbacksForWorkspace(ctx, workspace._id, accessible, membership.role, {
      projectId: args.projectId,
      limit: args.limit,
    });
  },
});

export const getRollback = query({
  args: {
    workspaceId: v.string(),
    rollbackId: v.id("rollbackEvents"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(args.rollbackId);
    if (!doc) return null;
    if (doc.projectId) {
      await assertDecisionRead(ctx, args.workspaceId, userId, {
        projectId: doc.projectId,
      } as never);
    }
    return docToRollback(doc);
  },
});
