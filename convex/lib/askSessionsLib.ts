import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getWorkspaceMembership } from "./authz";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type AskSessionStatus = "pending" | "completed" | "failed";

export type AskSessionRecord = {
  id: string;
  workspaceId: string;
  threadId: string;
  question: string;
  answer?: string;
  status: AskSessionStatus;
  evidenceEventIds?: string[];
  evidenceWorkstreamIds?: string[];
  error?: string;
  createdAt: number;
  updatedAt: number;
};

export type AskEvidenceEvent = {
  id: string;
  title: string;
  workstreamId?: string;
  artifactIds?: string[];
  artifactCount?: number;
  primaryArtifactId?: string;
  primaryArtifactTitle?: string;
};

export type AskEvidenceWorkstream = {
  id: string;
  title: string;
};

export type AskSessionDetail = AskSessionRecord & {
  evidence: {
    events: AskEvidenceEvent[];
    workstreams: AskEvidenceWorkstream[];
  };
};

export function docToAskSession(doc: Doc<"askSessions">): AskSessionRecord {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    threadId: doc.threadId,
    question: doc.question,
    answer: doc.answer,
    status: doc.status,
    evidenceEventIds: doc.evidenceEventIds,
    evidenceWorkstreamIds: doc.evidenceWorkstreamIds,
    error: doc.error,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createAskSessionDoc(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    threadId: string;
    question: string;
  },
): Promise<Id<"askSessions">> {
  const now = Date.now();
  return ctx.db.insert("askSessions", {
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    question: input.question,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
}

export async function completeAskSessionDoc(
  ctx: DbWriteCtx,
  input: {
    sessionId: Id<"askSessions">;
    answer: string;
    evidenceEventIds: Id<"events">[];
    evidenceWorkstreamIds: Id<"workstreams">[];
  },
): Promise<void> {
  await ctx.db.patch(input.sessionId, {
    answer: input.answer,
    status: "completed",
    evidenceEventIds: input.evidenceEventIds,
    evidenceWorkstreamIds: input.evidenceWorkstreamIds,
    updatedAt: Date.now(),
  });
}

export async function failAskSessionDoc(
  ctx: DbWriteCtx,
  input: {
    sessionId: Id<"askSessions">;
    error: string;
  },
): Promise<void> {
  await ctx.db.patch(input.sessionId, {
    status: "failed",
    error: input.error,
    updatedAt: Date.now(),
  });
}

export async function listAskSessionsForWorkspace(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  limit = 20,
): Promise<AskSessionRecord[]> {
  const docs = await ctx.db
    .query("askSessions")
    .withIndex("by_workspace_created_at", (q) =>
      q.eq("workspaceId", workspaceDocId),
    )
    .order("desc")
    .take(limit);

  return docs.map(docToAskSession);
}

export async function hydrateAskSessionEvidence(
  ctx: DbReadCtx,
  session: AskSessionRecord,
): Promise<AskSessionDetail> {
  const events: AskEvidenceEvent[] = [];
  for (const eventId of session.evidenceEventIds ?? []) {
    const event = await ctx.db.get(eventId as Id<"events">);
    if (event) {
      const artifactIds = event.artifactIds ?? [];
      let primaryArtifactTitle: string | undefined;
      let primaryArtifactId: string | undefined;

      if (artifactIds.length > 0) {
        primaryArtifactId = artifactIds[0];
        const artifact = await ctx.db.get(artifactIds[0]!);
        primaryArtifactTitle = artifact?.title;
      }

      events.push({
        id: event._id,
        title: event.title,
        workstreamId: event.workstreamId,
        artifactIds: artifactIds.length > 0 ? artifactIds : undefined,
        artifactCount: artifactIds.length > 0 ? artifactIds.length : undefined,
        primaryArtifactId,
        primaryArtifactTitle,
      });
    }
  }

  const workstreams: AskEvidenceWorkstream[] = [];
  for (const workstreamId of session.evidenceWorkstreamIds ?? []) {
    const workstream = await ctx.db.get(workstreamId as Id<"workstreams">);
    if (workstream) {
      workstreams.push({
        id: workstream._id,
        title: workstream.title,
      });
    }
  }

  return {
    ...session,
    evidence: { events, workstreams },
  };
}

export async function assertAskSessionAccess(
  ctx: DbReadCtx,
  sessionId: Id<"askSessions">,
  userId: string,
): Promise<Doc<"askSessions">> {
  const session = await ctx.db.get(sessionId);
  if (!session) {
    throw new Error("Ask session not found");
  }
  const workspace = await ctx.db.get(session.workspaceId);
  if (!workspace) {
    throw new Error("Ask session not found");
  }
  const membership = await getWorkspaceMembership(ctx, workspace._id, userId);
  if (!membership) {
    throw new Error("Ask session not found");
  }
  return session;
}
