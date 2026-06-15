import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export type IntegrationSource = Doc<"integrationConnections">["source"];

export type IntegrationCreatedBy = NonNullable<Doc<"integrationConnections">["createdBy"]>;

export async function getConnectionByWorkspaceSource(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  source: IntegrationSource,
): Promise<Doc<"integrationConnections"> | null> {
  return ctx.db
    .query("integrationConnections")
    .withIndex("by_workspace_source", (q) =>
      q.eq("workspaceId", workspaceId).eq("source", source),
    )
    .unique();
}

export async function upsertIntegrationConnection(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    source: IntegrationSource;
    name: string;
    status: Doc<"integrationConnections">["status"];
    createdBy?: IntegrationCreatedBy;
  },
): Promise<Id<"integrationConnections">> {
  const now = Date.now();
  const existing = await getConnectionByWorkspaceSource(ctx, input.workspaceId, input.source);

  if (existing) {
    await ctx.db.patch(existing._id, {
      status: input.status,
      updatedAt: now,
    });
    return existing._id;
  }

  return ctx.db.insert("integrationConnections", {
    workspaceId: input.workspaceId,
    source: input.source,
    name: input.name,
    status: input.status,
    eventCount: 0,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function recordIntegrationConnectionEvent(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
  source: IntegrationSource,
  occurredAt: number,
): Promise<void> {
  const connection = await getConnectionByWorkspaceSource(ctx, workspaceId, source);
  if (!connection) return;

  const eventCount = (connection.eventCount ?? 0) + 1;
  const lastEventAt = connection.lastEventAt
    ? Math.max(connection.lastEventAt, occurredAt)
    : occurredAt;

  const metadata = { ...(connection.metadata as Record<string, unknown> | undefined) };
  delete metadata.lastError;
  delete metadata.lastErrorAt;

  await ctx.db.patch(connection._id, {
    status: "connected",
    eventCount,
    lastEventAt,
    metadata,
    updatedAt: Date.now(),
  });
}

export async function setIntegrationConnectionStatus(
  ctx: DbWriteCtx,
  workspaceId: Id<"workspaces">,
  source: IntegrationSource,
  status: Doc<"integrationConnections">["status"],
): Promise<void> {
  const connection = await getConnectionByWorkspaceSource(ctx, workspaceId, source);
  if (!connection) return;
  await ctx.db.patch(connection._id, {
    status,
    updatedAt: Date.now(),
  });
}
