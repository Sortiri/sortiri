import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { insertEvent } from "./eventsLib";
import { EVENT_CATEGORIES } from "./eventTypes";

type DbCtx = Pick<MutationCtx, "db">;

export async function recordDecisionTimelineEvent(
  ctx: DbCtx,
  input: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    decisionId: Id<"decisions">;
    title: string;
    summary?: string;
    source: Doc<"decisions">["source"];
    decidedBy?: Doc<"decisions">["decidedBy"];
    tags?: string[];
    occurredAt?: number;
  },
): Promise<Id<"events">> {
  const actorName = input.decidedBy?.name ?? "Team";
  const eventId = await insertEvent(ctx, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    source: input.source === "slack" ? "slack" : input.source === "cli" ? "cli" : "manual",
    category: EVENT_CATEGORIES.DECISION,
    type: "decision.recorded",
    actor: {
      type: input.decidedBy?.type === "agent" ? "agent" : "human",
      name: actorName,
      email: input.decidedBy?.email,
      id: input.decidedBy?.clerkUserId ?? input.decidedBy?.slackUserId,
    },
    title: input.title,
    summary: input.summary,
    entity: { type: "other", id: input.decisionId, name: input.title },
    data: { decisionId: input.decisionId },
    tags: input.tags ?? ["decision"],
    visibility: "primary",
    importance: "high",
    occurredAt: input.occurredAt ?? Date.now(),
  });
  return eventId;
}

export async function recordRollbackTimelineEvent(
  ctx: DbCtx,
  input: {
    workspaceId: Id<"workspaces">;
    projectId?: Id<"projects">;
    workstreamId?: Id<"workstreams">;
    rollbackId: Id<"rollbackEvents">;
    decisionId?: Id<"decisions">;
    title: string;
    summary?: string;
    source: Doc<"rollbackEvents">["source"];
    occurredAt?: number;
  },
): Promise<Id<"events">> {
  const eventId = await insertEvent(ctx, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    workstreamId: input.workstreamId,
    source: input.source === "slack" ? "slack" : input.source === "github" ? "github" : "manual",
    category: EVENT_CATEGORIES.DECISION,
    type: "rollback.recorded",
    actor: { type: "human", name: "Team" },
    title: input.title,
    summary: input.summary,
    entity: { type: "other", id: input.rollbackId, name: input.title },
    data: { rollbackId: input.rollbackId, decisionId: input.decisionId },
    tags: ["rollback"],
    visibility: "primary",
    importance: "high",
    occurredAt: input.occurredAt ?? Date.now(),
  });
  return eventId;
}
