import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { insightAgent } from "./agents/insightAgent";
import { requireUserId } from "./lib/auth";
import { filterEventsForInsights } from "./lib/eventDisplay";
import {
  listEventsInWindow,
  listWorkstreamsForInsight,
} from "./lib/insightData";
import {
  buildInsightOverview,
  formatEventsForPrompt,
  formatFindingsForPrompt,
  formatOverviewForPrompt,
  formatWorkstreamsForPrompt,
  type InsightOverviewResult,
} from "./lib/insightOverview";
import { generateDeterministicFindings } from "./lib/insightRules";
import {
  assertInsightRunAccess,
  completeInsightRunDoc,
  createInsightRunDoc,
  docToInsightRun,
  failInsightRunDoc,
  hydrateFindingEvidence,
  insertInsightFindingDoc,
  listFindingsForRun,
  listInsightRunsForWorkspace,
  type InsightFindingDetail,
  type InsightFindingInput,
  type InsightRunRecord,
} from "./lib/insightRunsLib";
import {
  formatRunTitle,
  getWindowBounds,
  type InsightWindow,
} from "./lib/insightWindow";
import { insightWindowValidator } from "./lib/validators";
import { assertWorkspaceAccess } from "./lib/eventsLib";
import { requireWorkspaceRole } from "./lib/authz";
import type { EventRecord } from "./lib/eventsLib";
import type { WorkstreamRecord } from "./lib/workstreamsLib";

type RunDataResult = {
  events: EventRecord[];
  workstreams: WorkstreamRecord[];
  overview: InsightOverviewResult;
  windowStart: number;
  windowEnd: number;
};

export const fetchRunData = internalQuery({
  args: {
    workspaceExternalId: v.string(),
    userId: v.string(),
    window: insightWindowValidator,
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args): Promise<RunDataResult> => {
    const workspace = await assertWorkspaceAccess(
      ctx,
      args.workspaceExternalId,
      args.userId,
    );
    const { windowStart, windowEnd } = getWindowBounds(args.window);

    const events = filterEventsForInsights(
      await listEventsInWindow(ctx, workspace._id, windowStart, {
        projectId: args.projectId,
      }),
    );
    const workstreams = await listWorkstreamsForInsight(ctx, workspace._id, {
      projectId: args.projectId,
    });
    const overview = buildInsightOverview(events, workstreams);

    return {
      events,
      workstreams,
      overview,
      windowStart,
      windowEnd,
    };
  },
});

export const createRun = internalMutation({
  args: {
    workspaceExternalId: v.string(),
    userId: v.string(),
    window: insightWindowValidator,
    projectId: v.optional(v.id("projects")),
    generatedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspace } = await requireWorkspaceRole(
      ctx,
      args.workspaceExternalId,
      ["owner", "admin", "member"],
    );
    const { windowStart, windowEnd } = getWindowBounds(args.window);

    return createInsightRunDoc(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      title: formatRunTitle(args.window),
      windowStart,
      windowEnd,
      generatedBy: {
        type: "human",
        id: args.userId,
        name: args.generatedByName,
      },
    });
  },
});

export const completeRun = internalMutation({
  args: {
    runId: v.id("insightRuns"),
    summary: v.optional(v.string()),
    eventCount: v.number(),
    workstreamCount: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await completeInsightRunDoc(ctx, args);
  },
});

export const failRun = internalMutation({
  args: {
    runId: v.id("insightRuns"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await failInsightRunDoc(ctx, args);
  },
});

export const saveFindings = internalMutation({
  args: {
    workspaceExternalId: v.string(),
    userId: v.string(),
    runId: v.id("insightRuns"),
    projectId: v.optional(v.id("projects")),
    findings: v.array(
      v.object({
        type: v.string(),
        severity: v.string(),
        title: v.string(),
        summary: v.string(),
        recommendation: v.optional(v.string()),
        evidenceEventIds: v.optional(v.array(v.id("events"))),
        evidenceWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
        data: v.optional(v.any()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const workspace = await assertWorkspaceAccess(
      ctx,
      args.workspaceExternalId,
      args.userId,
    );

    for (const finding of args.findings) {
      await insertInsightFindingDoc(ctx, {
        workspaceId: workspace._id,
        projectId: args.projectId,
        runId: args.runId,
        finding: finding as InsightFindingInput,
      });
    }
  },
});

export const getOverview = query({
  args: {
    workspaceId: v.string(),
    window: v.optional(insightWindowValidator),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args): Promise<InsightOverviewResult> => {
    const userId = await requireUserId(ctx);
    const window = args.window ?? "7d";
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    const { windowStart } = getWindowBounds(window);

    const events = filterEventsForInsights(
      await listEventsInWindow(ctx, workspace._id, windowStart, {
        projectId: args.projectId,
      }),
    );
    const workstreams = await listWorkstreamsForInsight(ctx, workspace._id, {
      projectId: args.projectId,
    });

    return buildInsightOverview(events, workstreams);
  },
});

export const listRuns = query({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<InsightRunRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    return listInsightRunsForWorkspace(ctx, workspace._id, args.limit ?? 10);
  },
});

export const getRun = query({
  args: {
    runId: v.id("insightRuns"),
  },
  handler: async (ctx, args): Promise<InsightRunRecord | null> => {
    const userId = await requireUserId(ctx);
    const run = await assertInsightRunAccess(ctx, args.runId, userId);
    return docToInsightRun(run);
  },
});

export const listFindingsByRun = query({
  args: {
    runId: v.id("insightRuns"),
  },
  handler: async (ctx, args): Promise<InsightFindingDetail[]> => {
    const userId = await requireUserId(ctx);
    await assertInsightRunAccess(ctx, args.runId, userId);

    const findings = await listFindingsForRun(ctx, args.runId);
    return Promise.all(
      findings.map((finding) => hydrateFindingEvidence(ctx, finding)),
    );
  },
});

export const generateRun = action({
  args: {
    workspaceId: v.string(),
    window: v.optional(insightWindowValidator),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args): Promise<{ runId: Id<"insightRuns"> }> => {
    const userId = await requireUserId(ctx);
    const window: InsightWindow = args.window ?? "7d";

    const runId: Id<"insightRuns"> = await ctx.runMutation(internal.insights.createRun, {
      workspaceExternalId: args.workspaceId,
      userId,
      window,
      projectId: args.projectId,
    });

    try {
      const data: RunDataResult = await ctx.runQuery(internal.insights.fetchRunData, {
        workspaceExternalId: args.workspaceId,
        userId,
        window,
        projectId: args.projectId,
      });

      const findings = generateDeterministicFindings({
        events: data.events,
        workstreams: data.workstreams,
        windowStart: data.windowStart,
        windowEnd: data.windowEnd,
      });

      let summary: string | undefined;
      let summaryError: string | undefined;

      try {
        const { thread } = await insightAgent.createThread(ctx, {
          title: formatRunTitle(window),
          userId,
        });

        const prompt = `Analyze this company timeline and produce a concise insight report summary.

Overview:
${formatOverviewForPrompt(data.overview)}

Recent events:
${formatEventsForPrompt(data.events)}

Recent workstreams:
${formatWorkstreamsForPrompt(data.workstreams)}

Deterministic findings:
${formatFindingsForPrompt(findings)}

Write a 2-4 sentence operational summary for a founder. Only use the context above.`;

        const result = await thread.generateText({ prompt });
        summary = result.text;
      } catch (error) {
        summaryError =
          error instanceof Error ? error.message : "Failed to generate AI summary";
        summary =
          findings.length > 0
            ? `Found ${findings.length} insight${findings.length === 1 ? "" : "s"} from timeline data. AI summary unavailable.`
            : "Not enough timeline data to generate a detailed summary yet.";
      }

      await ctx.runMutation(internal.insights.saveFindings, {
        workspaceExternalId: args.workspaceId,
        userId,
        runId,
        projectId: args.projectId,
        findings,
      });

      await ctx.runMutation(internal.insights.completeRun, {
        runId,
        summary,
        eventCount: data.events.length,
        workstreamCount: data.workstreams.length,
        error: summaryError,
      });

      return { runId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Insight run failed";
      await ctx.runMutation(internal.insights.failRun, {
        runId,
        error: message,
      });
      throw error;
    }
  },
});
