import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { docToEvent, type EventRecord } from "./eventsLib";
import { docToWorkstream, type WorkstreamRecord } from "./workstreamsLib";

type DbReadCtx = Pick<QueryCtx, "db">;

const DEFAULT_SCAN_LIMIT = 500;
const DEFAULT_WORKSTREAM_LIMIT = 100;

export function isMetaInsightEvent(event: EventRecord): boolean {
  if (event.type.startsWith("ask.")) return true;
  if (event.tags?.includes("meta")) return true;
  return false;
}

export async function listEventsInWindow(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  windowStart: number,
  options: { scanLimit?: number; projectId?: Id<"projects"> } = {},
): Promise<EventRecord[]> {
  const scanLimit = options.scanLimit ?? DEFAULT_SCAN_LIMIT;

  let docs;
  if (options.projectId) {
    docs = await ctx.db
      .query("events")
      .withIndex("by_project", (q) => q.eq("projectId", options.projectId!))
      .order("desc")
      .take(scanLimit);
  } else {
    docs = await ctx.db
      .query("events")
      .withIndex("by_workspace_occurred_at", (q) =>
        q.eq("workspaceId", workspaceDocId),
      )
      .order("desc")
      .take(scanLimit);
  }

  return docs
    .filter((doc) => doc.occurredAt >= windowStart)
    .map(docToEvent)
    .filter((event) => !isMetaInsightEvent(event));
}

export async function listWorkstreamsForInsight(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  options: { limit?: number; projectId?: Id<"projects"> } = {},
): Promise<WorkstreamRecord[]> {
  const limit = options.limit ?? DEFAULT_WORKSTREAM_LIMIT;

  if (options.projectId) {
    const docs = await ctx.db
      .query("workstreams")
      .withIndex("by_project", (q) => q.eq("projectId", options.projectId!))
      .collect();
    return docs
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit)
      .map(docToWorkstream);
  }

  const docs = await ctx.db
    .query("workstreams")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceDocId))
    .order("desc")
    .take(limit);

  return docs.map(docToWorkstream);
}
