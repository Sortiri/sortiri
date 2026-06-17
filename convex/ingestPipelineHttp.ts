import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  runIngestPipelineInConvex,
  replayFromJournal,
  type FailureInjection,
} from "./lib/ingestPipelineLib";

const reliabilityAuthArgs = {
  ingestKey: v.optional(v.string()),
  apiKeyId: v.optional(v.id("apiKeys")),
  workspaceId: v.optional(v.string()),
  serverKey: v.optional(v.string()),
  workspaceExternalId: v.optional(v.string()),
};

export const runIngest = internalMutation({
  args: {
    ...reliabilityAuthArgs,
    body: v.any(),
    route: v.optional(v.string()),
    apiKeyIdForMetadata: v.optional(v.id("apiKeys")),
    integrationSource: v.optional(v.string()),
    integrationDeliveryId: v.optional(v.string()),
    integrationEventType: v.optional(v.string()),
    failJournalWrite: v.optional(v.boolean()),
    failConvexWrite: v.optional(v.boolean()),
    forceDeadLetter: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const injection: FailureInjection = {
      failJournalWrite: args.failJournalWrite,
      failConvexWrite: args.failConvexWrite,
      forceDeadLetter: args.forceDeadLetter,
    };
    return runIngestPipelineInConvex(ctx, {
      ingestKey: args.ingestKey,
      apiKeyId: args.apiKeyId,
      workspaceId: args.workspaceId,
      serverKey: args.serverKey,
      workspaceExternalId: args.workspaceExternalId,
      body: args.body,
      route: args.route,
      apiKeyIdForMetadata: args.apiKeyIdForMetadata,
      integration:
        args.integrationSource && args.integrationDeliveryId
          ? {
              source: args.integrationSource,
              deliveryId: args.integrationDeliveryId,
              eventType: args.integrationEventType,
            }
          : undefined,
      injection,
    });
  },
});

export const replayDelivery = internalMutation({
  args: {
    ...reliabilityAuthArgs,
    deliveryId: v.id("ingestDeliveries"),
    journalRef: v.string(),
  },
  handler: async (ctx, args) => {
    return replayFromJournal(ctx, args);
  },
});
