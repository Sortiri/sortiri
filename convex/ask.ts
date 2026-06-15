import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { askSortiriAgent } from "./agents/askSortiriAgent";
import { requireUserId } from "./lib/auth";
import { retrieveAskContext, type AskContextResult } from "./lib/askContext";
import { assertWorkspaceAccess, insertEvent } from "./lib/eventsLib";
import {
  assertAskSessionAccess,
  completeAskSessionDoc,
  createAskSessionDoc,
  docToAskSession,
  failAskSessionDoc,
  hydrateAskSessionEvidence,
  listAskSessionsForWorkspace,
  type AskSessionDetail,
  type AskSessionRecord,
} from "./lib/askSessionsLib";

export const retrieveContext = internalQuery({
  args: {
    workspaceExternalId: v.string(),
    userId: v.string(),
    question: v.string(),
    workstreamId: v.optional(v.id("workstreams")),
    entityId: v.optional(v.id("entities")),
    projectId: v.optional(v.id("projects")),
    viewId: v.optional(v.id("savedViews")),
    auditReportId: v.optional(v.id("auditReports")),
    impactAnalysisId: v.optional(v.id("impactAnalyses")),
    lessonId: v.optional(v.id("lessons")),
    playbookId: v.optional(v.id("playbooks")),
    contextPackId: v.optional(v.id("contextPacks")),
    recommendationId: v.optional(v.id("recommendations")),
    evalSuiteId: v.optional(v.id("evalSuites")),
    evalRunId: v.optional(v.id("evalRuns")),
  },
  handler: async (ctx, args) => {
    const workspace = await assertWorkspaceAccess(
      ctx,
      args.workspaceExternalId,
      args.userId,
    );
    return retrieveAskContext(ctx, workspace._id, args.question, {
      workstreamId: args.workstreamId,
      entityId: args.entityId,
      projectId: args.projectId,
      viewId: args.viewId,
      auditReportId: args.auditReportId,
      impactAnalysisId: args.impactAnalysisId,
      lessonId: args.lessonId,
      playbookId: args.playbookId,
      contextPackId: args.contextPackId,
      recommendationId: args.recommendationId,
      evalSuiteId: args.evalSuiteId,
      evalRunId: args.evalRunId,
      clerkUserId: args.userId,
    });
  },
});

export const createSession = internalMutation({
  args: {
    workspaceExternalId: v.string(),
    userId: v.string(),
    threadId: v.string(),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace = await assertWorkspaceAccess(
      ctx,
      args.workspaceExternalId,
      args.userId,
    );
    return createAskSessionDoc(ctx, {
      workspaceId: workspace._id,
      threadId: args.threadId,
      question: args.question,
    });
  },
});

export const completeSession = internalMutation({
  args: {
    sessionId: v.id("askSessions"),
    answer: v.string(),
    evidenceEventIds: v.array(v.id("events")),
    evidenceWorkstreamIds: v.array(v.id("workstreams")),
  },
  handler: async (ctx, args) => {
    await completeAskSessionDoc(ctx, args);
  },
});

export const failSession = internalMutation({
  args: {
    sessionId: v.id("askSessions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await failAskSessionDoc(ctx, args);
  },
});

export const recordQuestionSubmitted = internalMutation({
  args: {
    workspaceExternalId: v.string(),
    userId: v.string(),
    sessionId: v.id("askSessions"),
    questionLength: v.number(),
  },
  handler: async (ctx, args) => {
    const workspace = await assertWorkspaceAccess(
      ctx,
      args.workspaceExternalId,
      args.userId,
    );

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "sdk",
      category: "product_event",
      type: "ask.question_submitted",
      actor: {
        type: "customer",
        id: args.userId,
      },
      title: "Ask Sortiri question submitted",
      data: {
        questionLength: args.questionLength,
        sessionId: args.sessionId,
      },
      tags: ["meta", "ask"],
    });
  },
});

export const ask = action({
  args: {
    workspaceId: v.string(),
    question: v.string(),
    threadId: v.optional(v.string()),
    workstreamId: v.optional(v.id("workstreams")),
    entityId: v.optional(v.id("entities")),
    projectId: v.optional(v.id("projects")),
    viewId: v.optional(v.id("savedViews")),
    auditReportId: v.optional(v.id("auditReports")),
    impactAnalysisId: v.optional(v.id("impactAnalyses")),
    lessonId: v.optional(v.id("lessons")),
    playbookId: v.optional(v.id("playbooks")),
    contextPackId: v.optional(v.id("contextPacks")),
    recommendationId: v.optional(v.id("recommendations")),
    evalSuiteId: v.optional(v.id("evalSuites")),
    evalRunId: v.optional(v.id("evalRuns")),
  },
  handler: async (ctx, args): Promise<{
    sessionId: Id<"askSessions">;
    threadId: string;
    answer: string;
    evidenceEventIds: Id<"events">[];
    evidenceWorkstreamIds: Id<"workstreams">[];
  }> => {
    const userId = await requireUserId(ctx);
    const question = args.question.trim();
    if (!question) {
      throw new Error("Question is required");
    }

    const context: AskContextResult = await ctx.runQuery(internal.ask.retrieveContext, {
      workspaceExternalId: args.workspaceId,
      userId,
      question,
      workstreamId: args.workstreamId,
      entityId: args.entityId,
      projectId: args.projectId,
      viewId: args.viewId,
      auditReportId: args.auditReportId,
      impactAnalysisId: args.impactAnalysisId,
      lessonId: args.lessonId,
      playbookId: args.playbookId,
      contextPackId: args.contextPackId,
      recommendationId: args.recommendationId,
      evalSuiteId: args.evalSuiteId,
      evalRunId: args.evalRunId,
    });

    let threadId = args.threadId;
    let thread;

    if (threadId) {
      ({ thread } = await askSortiriAgent.continueThread(ctx, { threadId, userId }));
    } else {
      const created = await askSortiriAgent.createThread(ctx, {
        title: question,
        userId,
      });
      threadId = created.threadId;
      thread = created.thread;
      if (!thread) {
        throw new Error("Failed to create Ask thread");
      }
    }

    const sessionId: Id<"askSessions"> = await ctx.runMutation(internal.ask.createSession, {
      workspaceExternalId: args.workspaceId,
      userId,
      threadId,
      question,
    });

    void ctx.runMutation(internal.ask.recordQuestionSubmitted, {
      workspaceExternalId: args.workspaceId,
      userId,
      sessionId,
      questionLength: question.length,
    });

    const prompt: string = args.auditReportId
      ? `Question: ${question}

Audit report evidence context:
${context.contextText}

Answer using ONLY the audit report evidence above. If there is not enough information in the report, say what is missing. Do not infer or reconstruct redacted secrets. Mention when evidence was excluded from the report.`
      : args.impactAnalysisId
        ? `Question: ${question}

Impact analysis context:
${context.contextText}

Answer using ONLY the impact analysis context above. Do not claim causation. Use cautious language (possibly related, in the impact window, correlation only). If there is not enough information, say what is missing.`
        : args.lessonId
          ? `Question: ${question}

Lesson context:
${context.contextText}

Answer using ONLY the lesson context above. Do not claim causation. Use cautious language. If there is not enough information, say what is missing.`
          : args.playbookId
            ? `Question: ${question}

Playbook context:
${context.contextText}

Answer using ONLY the playbook context above. Help the user follow steps and validation without claiming causation.`
            : args.contextPackId
              ? `Question: ${question}

Context pack:
${context.contextText}

Answer using ONLY the context pack above. Prioritize lessons, failures, and validation requirements. Do not claim causation. Do not infer redacted secrets.`
              : args.recommendationId
                ? `Question: ${question}

Recommendation context:
${context.contextText}

Answer from the recommendation evidence first. Do not claim causation. Use cautious language and note when evidence is weak. Do not infer redacted secrets.`
                : args.evalSuiteId
                  ? `Question: ${question}

Eval suite context:
${context.contextText}

Explain what this eval suite checks. Do not claim causation. Use cautious language.`
                  : args.evalRunId
                    ? `Question: ${question}

Eval run context:
${context.contextText}

Explain why this eval failed or what the agent should fix next. Do not claim causation.`
                    : `Question: ${question}

Company timeline context:
${context.contextText}

Answer using only this context. If there is not enough information, say what is missing.`;

    try {
      const result = await thread.generateText({ prompt });
      const answer: string = result.text;

      await ctx.runMutation(internal.ask.completeSession, {
        sessionId,
        answer,
        evidenceEventIds: context.eventIds,
        evidenceWorkstreamIds: context.workstreamIds,
      });

      return {
        sessionId,
        threadId,
        answer,
        evidenceEventIds: context.eventIds,
        evidenceWorkstreamIds: context.workstreamIds,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ask failed";
      await ctx.runMutation(internal.ask.failSession, {
        sessionId,
        error: message,
      });
      throw error;
    }
  },
});

export const listSessions = query({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<AskSessionRecord[]> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    return listAskSessionsForWorkspace(ctx, workspace._id, args.limit ?? 20);
  },
});

export const getSession = query({
  args: {
    sessionId: v.id("askSessions"),
  },
  handler: async (ctx, args): Promise<AskSessionDetail | null> => {
    const userId = await requireUserId(ctx);
    const session = await assertAskSessionAccess(ctx, args.sessionId, userId);
    return hydrateAskSessionEvidence(ctx, docToAskSession(session));
  },
});
