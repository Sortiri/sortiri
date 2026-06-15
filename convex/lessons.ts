import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  canViewEvent,
  canViewWorkstream,
  getCurrentUser,
  getMembershipAndAccessible,
  requireWorkspaceRole,
} from "./lib/authz";
import { assertWorkspaceBrowseAccess, insertEvent } from "./lib/eventsLib";
import {
  generateLessonsFromFailurePatterns,
} from "./lib/failurePatterns";
import {
  impactFindingDedupTag,
  lessonFromImpactFinding,
  lessonFromInsightFinding,
  scanSecurityLessonsFromArtifacts,
  scanValidationLessonsFromEvents,
} from "./lib/lessonGeneration";
import {
  createLessonDoc,
  docToLesson,
  hasLessonWithTag,
  listLessonsByEntity,
  listLessonsByImpactAnalysis,
  listLessonsByProject,
  listLessonsByWorkstream,
  listLessonsForWorkspace,
  patchLessonDoc,
  type LessonInput,
} from "./lib/lessonsLib";
import { listFindingsForAnalysis } from "./lib/impactAnalysesLib";
import {
  lessonConfidenceValidator,
  lessonImportanceValidator,
  lessonStatusValidator,
  lessonTypeValidator,
} from "./lib/validators";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { AccessibleProjects } from "./lib/projectAccessLib";

type DbCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;

async function filterLessonEvidence(
  ctx: DbCtx,
  lesson: LessonInput,
  accessible: AccessibleProjects,
): Promise<LessonInput> {
  const evidenceEventIds: Id<"events">[] = [];
  for (const eventId of lesson.evidenceEventIds ?? []) {
    const event = await ctx.db.get(eventId);
    if (event && canViewEvent({ projectId: event.projectId }, accessible)) {
      evidenceEventIds.push(eventId);
    }
  }

  const evidenceWorkstreamIds: Id<"workstreams">[] = [];
  for (const wsId of lesson.evidenceWorkstreamIds ?? []) {
    const ws = await ctx.db.get(wsId);
    if (ws && canViewWorkstream({ projectId: ws.projectId }, accessible)) {
      evidenceWorkstreamIds.push(wsId);
    }
  }

  const evidenceArtifactIds: Id<"artifacts">[] = [];
  for (const artifactId of lesson.evidenceArtifactIds ?? []) {
    const artifact = await ctx.db.get(artifactId);
    if (
      artifact &&
      artifact.redactionStatus !== "blocked" &&
      artifact.safeForAudit !== false
    ) {
      evidenceArtifactIds.push(artifactId);
    }
  }

  return {
    ...lesson,
    evidenceEventIds: evidenceEventIds.length > 0 ? evidenceEventIds : undefined,
    evidenceWorkstreamIds:
      evidenceWorkstreamIds.length > 0 ? evidenceWorkstreamIds : undefined,
    evidenceArtifactIds:
      evidenceArtifactIds.length > 0 ? evidenceArtifactIds : undefined,
  };
}

async function recordLessonEvent(
  ctx: Parameters<typeof insertEvent>[0],
  input: {
    workspaceId: Id<"workspaces">;
    lessonId: Id<"lessons">;
    type: "lesson.generated" | "lesson.created" | "lesson.archived";
    title: string;
    actor: { type: "human"; name?: string; email?: string; id?: string };
  },
): Promise<void> {
  await insertEvent(ctx, {
    workspaceId: input.workspaceId,
    source: "system",
    category: "system_event",
    type: input.type,
    actor: input.actor,
    title: input.title,
    summary: `Lesson ${input.type.replace("lesson.", "")}.`,
    entity: { type: "other", id: input.lessonId, name: input.title },
    visibility: "primary",
    importance: "normal",
    occurredAt: Date.now(),
  });
}

export const generateFromImpactAnalysis = mutation({
  args: {
    impactAnalysisId: v.id("impactAnalyses"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const analysis = await ctx.db.get(args.impactAnalysisId);
    if (!analysis) {
      throw new Error("Impact analysis not found");
    }
    if (analysis.status !== "generated") {
      throw new Error("Impact analysis must be generated first");
    }

    const workspace = await ctx.db.get(analysis.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    await requireWorkspaceRole(ctx, workspace.externalId, [
      "owner",
      "admin",
      "member",
    ]);

    const { accessible } = await getMembershipAndAccessible(
      ctx,
      analysis.workspaceId,
      user.clerkUserId,
    );

    const findings = await listFindingsForAnalysis(ctx, args.impactAnalysisId);
    const createdIds: Id<"lessons">[] = [];

    for (const finding of findings) {
      const tag = impactFindingDedupTag(finding.id);
      if (await hasLessonWithTag(ctx, analysis.workspaceId, tag)) {
        continue;
      }

      let lessonInput = lessonFromImpactFinding(finding, {
        workspaceId: analysis.workspaceId,
        projectId: analysis.projectId,
        viewId: analysis.viewId,
        impactAnalysisId: args.impactAnalysisId,
      });
      lessonInput = await filterLessonEvidence(ctx, lessonInput, accessible);

      const lessonId = await createLessonDoc(ctx, lessonInput);
      createdIds.push(lessonId);

      await recordLessonEvent(ctx, {
        workspaceId: analysis.workspaceId,
        lessonId,
        type: "lesson.generated",
        title: lessonInput.title,
        actor: {
          type: "human",
          id: user.clerkUserId,
          email: user.email,
          name: user.name,
        },
      });
    }

    const allArtifactIds = findings.flatMap(
      (f) => (f.evidenceArtifactIds as Id<"artifacts">[] | undefined) ?? [],
    );
    if (allArtifactIds.length > 0) {
      const securityLesson = await scanSecurityLessonsFromArtifacts(
        ctx,
        allArtifactIds,
        {
          workspaceId: analysis.workspaceId,
          projectId: analysis.projectId,
          impactAnalysisId: args.impactAnalysisId,
        },
      );
      if (
        securityLesson &&
        !(await hasLessonWithTag(ctx, analysis.workspaceId, "security-evidence"))
      ) {
        const filtered = await filterLessonEvidence(ctx, securityLesson, accessible);
        const lessonId = await createLessonDoc(ctx, filtered);
        createdIds.push(lessonId);
      }
    }

    const failureEventTypes = findings.flatMap((f) => {
      const ids = f.evidenceEventIds ?? [];
      return ids.map(() => "command.failed");
    });
    if (failureEventTypes.length > 0) {
      const validationLesson = await scanValidationLessonsFromEvents(failureEventTypes, {
        workspaceId: analysis.workspaceId,
        projectId: analysis.projectId,
        impactAnalysisId: args.impactAnalysisId,
        evidenceEventIds: findings.flatMap(
          (f) => (f.evidenceEventIds as Id<"events">[] | undefined) ?? [],
        ),
      });
      if (
        validationLesson &&
        !(await hasLessonWithTag(ctx, analysis.workspaceId, "validation-from-evidence"))
      ) {
        const filtered = await filterLessonEvidence(ctx, validationLesson, accessible);
        const lessonId = await createLessonDoc(ctx, filtered);
        createdIds.push(lessonId);
      }
    }

    return { lessonIds: createdIds };
  },
});

export const generateFromInsightFinding = mutation({
  args: {
    insightFindingId: v.id("insightFindings"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const finding = await ctx.db.get(args.insightFindingId);
    if (!finding) {
      throw new Error("Insight finding not found");
    }

    const workspace = await ctx.db.get(finding.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    await requireWorkspaceRole(ctx, workspace.externalId, [
      "owner",
      "admin",
      "member",
    ]);

    const tag = `insight-finding:${args.insightFindingId}`;
    if (await hasLessonWithTag(ctx, finding.workspaceId, tag)) {
      const existing = await ctx.db
        .query("lessons")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", finding.workspaceId))
        .collect();
      const match = existing.find((l) => l.tags?.includes(tag));
      return { lessonId: match?._id };
    }

    const lessonInput = lessonFromInsightFinding({
      workspaceId: finding.workspaceId,
      projectId: finding.projectId,
      insightFindingId: args.insightFindingId,
      title: finding.title,
      summary: finding.summary,
      recommendation: finding.recommendation,
      type: finding.type === "lesson_opportunity" ? "process_learning" : "other",
    });

    const lessonId = await createLessonDoc(ctx, lessonInput);
    await recordLessonEvent(ctx, {
      workspaceId: finding.workspaceId,
      lessonId,
      type: "lesson.generated",
      title: lessonInput.title,
      actor: {
        type: "human",
        id: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });

    return { lessonId };
  },
});

export const generateFromFailurePattern = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
    ]);

    const { accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      user.clerkUserId,
    );

    const inputs = await generateLessonsFromFailurePatterns(ctx, workspace._id);
    const createdIds: Id<"lessons">[] = [];

    for (const input of inputs) {
      const tag = input.tags?.[0];
      if (tag && (await hasLessonWithTag(ctx, workspace._id, tag))) {
        continue;
      }
      const filtered = await filterLessonEvidence(ctx, input, accessible);
      const lessonId = await createLessonDoc(ctx, filtered);
      createdIds.push(lessonId);
      await recordLessonEvent(ctx, {
        workspaceId: workspace._id,
        lessonId,
        type: "lesson.generated",
        title: filtered.title,
        actor: {
          type: "human",
          id: user.clerkUserId,
          email: user.email,
          name: user.name,
        },
      });
    }

    return { lessonIds: createdIds };
  },
});

export const createManualLesson = mutation({
  args: {
    workspaceId: v.string(),
    title: v.string(),
    summary: v.string(),
    type: lessonTypeValidator,
    recommendation: v.optional(v.string()),
    importance: v.optional(lessonImportanceValidator),
    confidence: v.optional(lessonConfidenceValidator),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    entityId: v.optional(v.id("entities")),
    impactAnalysisId: v.optional(v.id("impactAnalyses")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
    ]);

    const lessonId = await createLessonDoc(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      entityId: args.entityId,
      impactAnalysisId: args.impactAnalysisId,
      title: args.title.trim(),
      summary: args.summary.trim(),
      type: args.type,
      status: "active",
      confidence: args.confidence ?? "possible",
      importance: args.importance ?? "normal",
      source: "manual",
      recommendation: args.recommendation,
      createdBy: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });

    await recordLessonEvent(ctx, {
      workspaceId: workspace._id,
      lessonId,
      type: "lesson.created",
      title: args.title,
      actor: {
        type: "human",
        id: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });

    return { lessonId };
  },
});

export const getById = query({
  args: {
    lessonId: v.id("lessons"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) {
      return null;
    }

    const workspace = await ctx.db.get(lesson.workspaceId);
    if (!workspace) {
      return null;
    }

    await assertWorkspaceBrowseAccess(ctx, workspace.externalId, user.clerkUserId);

    const { accessible } = await getMembershipAndAccessible(
      ctx,
      lesson.workspaceId,
      user.clerkUserId,
    );

    const filtered = await filterLessonEvidence(
      ctx,
      {
        ...lesson,
        workspaceId: lesson.workspaceId,
        title: lesson.title,
        summary: lesson.summary,
        type: lesson.type,
        status: lesson.status,
        confidence: lesson.confidence,
        importance: lesson.importance,
        source: lesson.source,
      },
      accessible,
    );

    return {
      lesson: docToLesson(lesson),
      accessibleEvidence: {
        eventIds: filtered.evidenceEventIds,
        workstreamIds: filtered.evidenceWorkstreamIds,
        artifactIds: filtered.evidenceArtifactIds,
      },
    };
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.string(),
    type: v.optional(lessonTypeValidator),
    status: v.optional(lessonStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    return listLessonsForWorkspace(ctx, workspace._id, {
      type: args.type,
      status: args.status,
      limit: args.limit,
    });
  },
});

export const listByProject = query({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    const lessons = await listLessonsByProject(ctx, args.projectId);
    return lessons.filter((l) => l.workspaceId === workspace._id);
  },
});

export const listByEntity = query({
  args: {
    workspaceId: v.string(),
    entityId: v.id("entities"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    const lessons = await listLessonsByEntity(ctx, args.entityId);
    return lessons.filter((l) => l.workspaceId === workspace._id);
  },
});

export const listByWorkstream = query({
  args: {
    workspaceId: v.string(),
    workstreamId: v.id("workstreams"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    const lessons = await listLessonsByWorkstream(ctx, args.workstreamId);
    return lessons.filter((l) => l.workspaceId === workspace._id);
  },
});

export const listByImpactAnalysis = query({
  args: {
    impactAnalysisId: v.id("impactAnalyses"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const analysis = await ctx.db.get(args.impactAnalysisId);
    if (!analysis) {
      return [];
    }

    const workspace = await ctx.db.get(analysis.workspaceId);
    if (!workspace) {
      return [];
    }

    await assertWorkspaceBrowseAccess(ctx, workspace.externalId, user.clerkUserId);
    return listLessonsByImpactAnalysis(ctx, args.impactAnalysisId);
  },
});

export const archive = mutation({
  args: {
    lessonId: v.id("lessons"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) {
      throw new Error("Lesson not found");
    }

    const workspace = await ctx.db.get(lesson.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const { membership } = await requireWorkspaceRole(ctx, workspace.externalId, [
      "owner",
      "admin",
      "member",
    ]);

    if (membership.role === "member") {
      if (lesson.source !== "manual" || lesson.createdBy?.clerkUserId !== user.clerkUserId) {
        throw new Error("Members can only archive their own manual lessons");
      }
    }

    await patchLessonDoc(ctx, args.lessonId, { status: "archived" });
    await recordLessonEvent(ctx, {
      workspaceId: lesson.workspaceId,
      lessonId: args.lessonId,
      type: "lesson.archived",
      title: lesson.title,
      actor: {
        type: "human",
        id: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });
  },
});

export const activate = mutation({
  args: {
    lessonId: v.id("lessons"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) {
      throw new Error("Lesson not found");
    }

    const workspace = await ctx.db.get(lesson.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);
    await patchLessonDoc(ctx, args.lessonId, { status: "active" });
    return { lessonId: args.lessonId };
  },
});
