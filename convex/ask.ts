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

    const prompt: string = `Question: ${question}

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
