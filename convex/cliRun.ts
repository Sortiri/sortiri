import { v } from "convex/values";
import { query } from "./_generated/server";
import { getWorkspaceDocByExternalId } from "./lib/workspacesLib";

function validateIntegrationServerKey(serverKey: string): void {
  const expected = process.env.SORTIRI_INTEGRATION_SERVER_KEY;
  if (!expected || serverKey !== expected) {
    throw new Error("Unauthorized");
  }
}

/** Dev/test helper — count recent CLI command events for smoke tests. */
export const countCommandEventsForTest = query({
  args: {
    serverKey: v.string(),
    workspaceExternalId: v.string(),
    sinceMs: v.number(),
  },
  handler: async (ctx, args) => {
    validateIntegrationServerKey(args.serverKey);
    const workspace = await getWorkspaceDocByExternalId(ctx, args.workspaceExternalId);

    const events = await ctx.db
      .query("events")
      .withIndex("by_workspace_occurred_at", (q) =>
        q.eq("workspaceId", workspace._id).gte("occurredAt", args.sinceMs),
      )
      .collect();

    const cliEvents = events.filter((e) => e.source === "cli");
    const byType = (type: string) => cliEvents.filter((e) => e.type === type).length;

    const commandOutputArtifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    const recentOutputs = commandOutputArtifacts.filter(
      (a) => a.type === "command_output" && a.createdAt >= args.sinceMs,
    );

    return {
      commandStarted: byType("command.started"),
      commandCompleted: byType("command.completed"),
      commandFailed: byType("command.failed"),
      commandOutputArtifacts: recentOutputs.length,
      sampleOutput: recentOutputs[0]?.content?.slice(0, 500) ?? null,
    };
  },
});
