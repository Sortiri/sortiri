import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveIngestWorkspace } from "./lib/ingestAuth";
import {
  assertNotAuditorWorkspaceBrowse,
  canWriteWorkspaceData,
  getMembershipAndAccessible,
} from "./lib/authz";
import {
  confirmDecisionCandidateDoc,
  dismissDecisionCandidateDoc,
  docToDecisionCandidate,
  listDecisionCandidatesForWorkspace,
} from "./lib/decisionCandidatesLib";
import {
  createDecisionDoc,
  docToDecision,
  linkDecisionToWorkstreamDoc,
  listDecisionsForWorkspace,
} from "./lib/decisionsLib";
import {
  createRollbackEventDoc,
  docToRollback,
} from "./lib/rollbackEventsLib";
import { decisionTypeValidator } from "./lib/validators";

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

export const recordDecision = mutation({
  args: {
    ...ingestAuthArgs,
    title: v.string(),
    summary: v.optional(v.string()),
    decisionType: v.optional(decisionTypeValidator),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    rationale: v.optional(v.string()),
    expectedOutcome: v.optional(v.string()),
    rollbackPlan: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
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

    const doc = await createDecisionDoc(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      title: args.title,
      summary: args.summary,
      decisionType: args.decisionType ?? "engineering",
      source: "cli",
      rationale: args.rationale,
      expectedOutcome: args.expectedOutcome,
      rollbackPlan: args.rollbackPlan,
      tags: args.tags,
      decidedBy: {
        clerkUserId: actor.clerkUserId,
        name: actor.name,
        email: actor.email,
        type: actor.type,
      },
    });
    return docToDecision(doc);
  },
});

export const listDecisionsForIngest = query({
  args: {
    ...ingestAuthArgs,
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("superseded"),
      v.literal("rolled_back"),
      v.literal("archived"),
    )),
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
    return listDecisionsForWorkspace(ctx, workspace._id, accessible, membership.role, {
      status: args.status,
      limit: args.limit,
    });
  },
});

export const getDecisionForIngest = query({
  args: {
    ...ingestAuthArgs,
    decisionId: v.id("decisions"),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const doc = await ctx.db.get(args.decisionId);
    if (!doc || doc.workspaceId !== workspace._id) throw new Error("Decision not found");
    return docToDecision(doc);
  },
});

export const linkToWorkstream = mutation({
  args: {
    ...ingestAuthArgs,
    decisionId: v.id("decisions"),
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

    const doc = await ctx.db.get(args.decisionId);
    if (!doc || doc.workspaceId !== workspace._id) throw new Error("Decision not found");
    const updated = await linkDecisionToWorkstreamDoc(ctx, args.decisionId, args.workstreamId);
    return docToDecision(updated);
  },
});

export const createRollback = mutation({
  args: {
    ...ingestAuthArgs,
    decisionId: v.optional(v.id("decisions")),
    title: v.string(),
    summary: v.optional(v.string()),
    reason: v.optional(v.string()),
    workstreamId: v.optional(v.id("workstreams")),
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

    const doc = await createRollbackEventDoc(ctx, {
      workspaceId: workspace._id,
      decisionId: args.decisionId,
      workstreamId: args.workstreamId,
      title: args.title,
      summary: args.summary,
      reason: args.reason,
      source: "cli",
    });
    return docToRollback(doc);
  },
});

export const listCandidatesForIngest = query({
  args: {
    ...ingestAuthArgs,
    limit: v.optional(v.number()),
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
    const rows = await listDecisionCandidatesForWorkspace(ctx, workspace._id, {
      status: "pending",
      limit: args.limit,
    });
    return rows;
  },
});

export const confirmCandidate = mutation({
  args: {
    ...ingestAuthArgs,
    candidateId: v.id("decisionCandidates"),
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

    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate || candidate.workspaceId !== workspace._id) {
      throw new Error("Candidate not found");
    }
    const result = await confirmDecisionCandidateDoc(ctx, args.candidateId, {
      clerkUserId: actor.clerkUserId,
      name: actor.name,
      email: actor.email,
      type: actor.type,
    });
    return {
      candidate: docToDecisionCandidate(result.candidate),
      decision: docToDecision(result.decision),
    };
  },
});

export const dismissCandidate = mutation({
  args: {
    ...ingestAuthArgs,
    candidateId: v.id("decisionCandidates"),
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

    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate || candidate.workspaceId !== workspace._id) {
      throw new Error("Candidate not found");
    }
    const updated = await dismissDecisionCandidateDoc(ctx, args.candidateId);
    return docToDecisionCandidate(updated);
  },
});
