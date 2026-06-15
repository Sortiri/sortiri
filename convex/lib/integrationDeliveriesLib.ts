import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { IntegrationSource } from "./integrationConnectionsLib";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export async function findDeliveryBySourceId(
  ctx: DbReadCtx,
  source: IntegrationSource | string,
  deliveryId: string,
) {
  return ctx.db
    .query("integrationDeliveries")
    .withIndex("by_source_delivery", (q) =>
      q.eq("source", source).eq("deliveryId", deliveryId),
    )
    .unique();
}

export async function isDuplicateDelivery(
  ctx: DbReadCtx,
  source: IntegrationSource | string,
  deliveryId: string,
): Promise<boolean> {
  const existing = await findDeliveryBySourceId(ctx, source, deliveryId);
  return existing?.status === "processed";
}

export async function markDeliveryProcessed(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    source: IntegrationSource | string;
    deliveryId: string;
    eventType?: string;
  },
): Promise<void> {
  await ctx.db.insert("integrationDeliveries", {
    workspaceId: input.workspaceId,
    source: input.source,
    deliveryId: input.deliveryId,
    eventType: input.eventType,
    status: "processed",
    createdAt: Date.now(),
  });
}

export async function markDeliveryFailed(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    source: IntegrationSource | string;
    deliveryId: string;
    eventType?: string;
    error: string;
  },
): Promise<void> {
  await ctx.db.insert("integrationDeliveries", {
    workspaceId: input.workspaceId,
    source: input.source,
    deliveryId: input.deliveryId,
    eventType: input.eventType,
    status: "failed",
    error: input.error,
    createdAt: Date.now(),
  });
}

export async function recordIntegrationDelivery(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    source: IntegrationSource | string;
    deliveryId?: string;
    eventType?: string;
    onRecord: () => Promise<Id<"events"> | void>;
  },
): Promise<{ duplicate: boolean; eventId?: Id<"events"> }> {
  if (input.deliveryId && (await isDuplicateDelivery(ctx, input.source, input.deliveryId))) {
    return { duplicate: true };
  }

  try {
    const eventId = await input.onRecord();
    if (input.deliveryId) {
      await markDeliveryProcessed(ctx, {
        workspaceId: input.workspaceId,
        source: input.source,
        deliveryId: input.deliveryId,
        eventType: input.eventType,
      });
    }
    return { duplicate: false, eventId: eventId ?? undefined };
  } catch (error) {
    if (input.deliveryId) {
      await markDeliveryFailed(ctx, {
        workspaceId: input.workspaceId,
        source: input.source,
        deliveryId: input.deliveryId,
        eventType: input.eventType,
        error: error instanceof Error ? error.message : "Failed to record event",
      });
    }
    throw error;
  }
}
