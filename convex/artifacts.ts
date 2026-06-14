import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { getWorkspaceMembership } from "./lib/authz";
import { docToArtifact } from "./lib/artifactsLib";
import { assertWorkstreamAccess } from "./lib/workstreamsLib";
import type { Artifact } from "../src/types/events";

async function getArtifactForUser(
  ctx: Pick<QueryCtx, "db">,
  artifactId: Id<"artifacts">,
  userId: string,
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
  return doc;
}

export const getById = query({
  args: {
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args): Promise<Artifact | null> => {
    const userId = await requireUserId(ctx);
    const doc = await getArtifactForUser(ctx, args.artifactId, userId);
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

    return docs
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(docToArtifact);
  },
});
