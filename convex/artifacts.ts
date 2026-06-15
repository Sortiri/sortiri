import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  canViewArtifact,
  getAccessibleProjectIds,
  getWorkspaceMembership,
  isAuditorRole,
} from "./lib/authz";
import { docToArtifact } from "./lib/artifactsLib";
import { assertWorkstreamAccess } from "./lib/workstreamsLib";
import { isArtifactInAccessibleReport } from "./lib/auditReportAccessLib";
import { isArtifactInReportSnapshot } from "./lib/auditReportsLib";
import { isArtifactSafeForAudit } from "./lib/sensitiveContent";
import type { Artifact } from "../src/types/events";

async function getArtifactForUser(
  ctx: Pick<QueryCtx, "db">,
  artifactId: Id<"artifacts">,
  userId: string,
  auditReportId?: Id<"auditReports">,
): Promise<Doc<"artifacts"> | null> {
  const doc = await ctx.db.get(artifactId);
  if (!doc) {
    return null;
  }
  const workspace = await ctx.db.get(doc.workspaceId);
  if (!workspace) {
    return null;
  }
  const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
  if (!membership) {
    return null;
  }

  if (isAuditorRole(membership.role)) {
    const allowed = await isArtifactInAccessibleReport(ctx, artifactId, membership._id);
    if (!allowed || !isArtifactSafeForAudit(doc)) {
      return null;
    }
    return doc;
  }

  if (auditReportId) {
    const inReport = await isArtifactInReportSnapshot(ctx, auditReportId, artifactId);
    if (!inReport) {
      return null;
    }
  }

  const accessible = await getAccessibleProjectIds(ctx, workspace._id, membership);
  let workstreamProjectId: Id<"projects"> | undefined;
  if (doc.workstreamId) {
    const workstream = await ctx.db.get(doc.workstreamId);
    workstreamProjectId = workstream?.projectId;
  }

  if (!canViewArtifact(doc, accessible, workstreamProjectId)) {
    return null;
  }

  return doc;
}

export const getById = query({
  args: {
    artifactId: v.id("artifacts"),
    auditReportId: v.optional(v.id("auditReports")),
  },
  handler: async (ctx, args): Promise<Artifact | null> => {
    const userId = await requireUserId(ctx);
    const doc = await getArtifactForUser(ctx, args.artifactId, userId, args.auditReportId);
    return doc ? docToArtifact(doc) : null;
  },
});

export const listByIds = query({
  args: {
    artifactIds: v.array(v.id("artifacts")),
  },
  handler: async (ctx, args): Promise<Artifact[]> => {
    const userId = await requireUserId(ctx);
    const artifacts: Artifact[] = [];

    for (const artifactId of args.artifactIds) {
      const doc = await getArtifactForUser(ctx, artifactId, userId);
      if (doc) {
        artifacts.push(docToArtifact(doc));
      }
    }

    return artifacts;
  },
});

export const listByWorkstream = query({
  args: {
    workstreamId: v.id("workstreams"),
  },
  handler: async (ctx, args): Promise<Artifact[]> => {
    const userId = await requireUserId(ctx);
    await assertWorkstreamAccess(ctx, args.workstreamId, userId);

    const docs = await ctx.db
      .query("artifacts")
      .withIndex("by_workstream", (q) => q.eq("workstreamId", args.workstreamId))
      .collect();

    const artifacts: Artifact[] = [];
    for (const doc of docs.sort((a, b) => b.createdAt - a.createdAt)) {
      const allowed = await getArtifactForUser(ctx, doc._id, userId);
      if (allowed) {
        artifacts.push(docToArtifact(allowed));
      }
    }

    return artifacts;
  },
});
