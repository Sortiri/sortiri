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
import { assertWorkspaceBrowseAccess } from "./lib/eventsLib";
import { insertEvent } from "./lib/eventsLib";
import { loadSavedViewFilters } from "./lib/savedViewEvents";
import {
  collectBaselineAndImpactEvents,
} from "./lib/impactData";
import {
  addRelatedWorkFindings,
  generateAllImpactFindings,
} from "./lib/impactFindings";
import {
  completeImpactAnalysisDoc,
  createImpactAnalysisDoc,
  deleteFindingsForAnalysis,
  docToImpactAnalysis,
  docToImpactFinding,
  failImpactAnalysisDoc,
  insertImpactFindingDoc,
  listFindingsForAnalysis,
  listImpactAnalysesForWorkspace,
  type ImpactFindingRecord,
} from "./lib/impactAnalysesLib";
import { computeMetricsWithDelta } from "./lib/impactMetrics";
import { buildDeterministicImpactSummary } from "./lib/impactSummary";
import {
  computeWindowFromAnchor,
  DEFAULT_AFTER_MS,
  DEFAULT_BEFORE_MS,
  resolveWorkstreamAnchorTime,
} from "./lib/impactWindows";
import {
  impactAnchorValidator,
  impactFiltersValidator,
  impactWindowPresetValidator,
} from "./lib/validators";
import { presetToMs } from "./lib/impactWindows";
import { listWorkstreamsForInsight } from "./lib/insightData";
import type { AccessibleProjects } from "./lib/projectAccessLib";

async function resolveAnchor(
  ctx: Parameters<typeof assertWorkspaceBrowseAccess>[0],
  workspaceId: Id<"workspaces">,
  anchor: {
    type: Doc<"impactAnalyses">["anchor"]["type"];
    eventId?: Id<"events">;
    workstreamId?: Id<"workstreams">;
    projectId?: Id<"projects">;
    viewId?: Id<"savedViews">;
    entityId?: Id<"entities">;
    title?: string;
    occurredAt?: number;
  },
): Promise<Doc<"impactAnalyses">["anchor"]> {
  if (anchor.type === "event" && anchor.eventId) {
    const event = await ctx.db.get(anchor.eventId);
    if (!event || event.workspaceId !== workspaceId) {
      throw new Error("Anchor event not found");
    }
    return {
      type: "event",
      eventId: anchor.eventId,
      title: anchor.title ?? event.title,
      occurredAt: event.occurredAt,
    };
  }

  if (anchor.type === "workstream" && anchor.workstreamId) {
    const workstream = await ctx.db.get(anchor.workstreamId);
    if (!workstream || workstream.workspaceId !== workspaceId) {
      throw new Error("Anchor workstream not found");
    }
    return {
      type: "workstream",
      workstreamId: anchor.workstreamId,
      title: anchor.title ?? workstream.title,
      occurredAt: resolveWorkstreamAnchorTime(workstream),
    };
  }

  if (anchor.type === "project" && anchor.projectId) {
    const project = await ctx.db.get(anchor.projectId);
    if (!project || project.workspaceId !== workspaceId) {
      throw new Error("Anchor project not found");
    }
    return {
      type: "project",
      projectId: anchor.projectId,
      title: anchor.title ?? project.name,
      occurredAt: anchor.occurredAt ?? Date.now(),
    };
  }

  if (anchor.type === "view" && anchor.viewId) {
    const view = await ctx.db.get(anchor.viewId);
    if (!view || view.workspaceId !== workspaceId) {
      throw new Error("Anchor view not found");
    }
    return {
      type: "view",
      viewId: anchor.viewId,
      title: anchor.title ?? view.name,
      occurredAt: anchor.occurredAt ?? Date.now(),
    };
  }

  if (anchor.type === "entity" && anchor.entityId) {
    const entity = await ctx.db.get(anchor.entityId);
    if (!entity || entity.workspaceId !== workspaceId) {
      throw new Error("Anchor entity not found");
    }
    return {
      type: "entity",
      entityId: anchor.entityId,
      title: anchor.title ?? entity.name,
      occurredAt: anchor.occurredAt ?? Date.now(),
    };
  }

  return {
    type: "manual",
    title: anchor.title ?? "Manual anchor",
    occurredAt: anchor.occurredAt ?? Date.now(),
  };
}

function filterFindingEvidence(
  finding: Parameters<typeof insertImpactFindingDoc>[1]["finding"],
  accessible: AccessibleProjects,
  eventProjectMap: Map<string, Id<"projects"> | undefined>,
  workstreamProjectMap: Map<string, Id<"projects"> | undefined>,
) {
  const evidenceEventIds = (finding.evidenceEventIds ?? []).filter((id) => {
    const projectId = eventProjectMap.get(String(id));
    return canViewEvent({ projectId }, accessible);
  });
  const evidenceWorkstreamIds = (finding.evidenceWorkstreamIds ?? []).filter((id) => {
    const projectId = workstreamProjectMap.get(String(id));
    return canViewWorkstream({ projectId }, accessible);
  });
  return {
    ...finding,
    evidenceEventIds: evidenceEventIds.length > 0 ? evidenceEventIds : undefined,
    evidenceWorkstreamIds:
      evidenceWorkstreamIds.length > 0 ? evidenceWorkstreamIds : undefined,
  };
}

async function recordImpactAnalysisEvent(
  ctx: Parameters<typeof insertEvent>[0],
  input: {
    workspaceId: Id<"workspaces">;
    analysisId: Id<"impactAnalyses">;
    title: string;
    actor: { type: "human"; name?: string; email?: string; id?: string };
  },
): Promise<void> {
  await insertEvent(ctx, {
    workspaceId: input.workspaceId,
    source: "system",
    category: "system_event",
    type: "impact_analysis.generated",
    actor: input.actor,
    title: input.title,
    summary: "Impact analysis generated with baseline and impact window metrics.",
    entity: { type: "other", id: input.analysisId, name: input.title },
    visibility: "primary",
    importance: "normal",
    occurredAt: Date.now(),
  });
}

export const create = mutation({
  args: {
    workspaceId: v.string(),
    title: v.string(),
    anchor: impactAnchorValidator,
    windowPreset: v.optional(impactWindowPresetValidator),
    beforeMs: v.optional(v.number()),
    afterMs: v.optional(v.number()),
    filters: v.optional(impactFiltersValidator),
    projectId: v.optional(v.id("projects")),
    viewId: v.optional(v.id("savedViews")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { workspace, membership } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
      "viewer",
    ]);

    const resolvedAnchor = await resolveAnchor(ctx, workspace._id, args.anchor);
    const beforeMs =
      args.beforeMs ??
      (args.windowPreset ? presetToMs(args.windowPreset) : DEFAULT_BEFORE_MS);
    const afterMs =
      args.afterMs ??
      (args.windowPreset ? presetToMs(args.windowPreset) : DEFAULT_AFTER_MS);
    const window = computeWindowFromAnchor(resolvedAnchor.occurredAt, beforeMs, afterMs);

    let filters = args.filters;
    if (args.viewId && !filters) {
      const viewFilters = await loadSavedViewFilters(
        ctx,
        args.viewId,
        workspace._id,
        user.clerkUserId,
      );
      if (viewFilters) {
        filters = {
          categories: viewFilters.categories,
          sources: viewFilters.sources,
          entityTypes: viewFilters.entityTypes,
          projectIds: viewFilters.projectIds,
          visibility: viewFilters.visibility === "primary" ? "primary" : "all",
        };
      }
    }

    const analysisId = await createImpactAnalysisDoc(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId ?? resolvedAnchor.projectId,
      viewId: args.viewId ?? resolvedAnchor.viewId,
      title: args.title.trim() || `Impact: ${resolvedAnchor.title}`,
      anchor: resolvedAnchor,
      window,
      filters,
      createdBy: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });

    return { analysisId, workspaceId: workspace.externalId };
  },
});

export const generate = mutation({
  args: {
    analysisId: v.id("impactAnalyses"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) {
      throw new Error("Impact analysis not found");
    }

    const workspace = await ctx.db.get(analysis.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    await requireWorkspaceRole(ctx, workspace.externalId, [
      "owner",
      "admin",
      "member",
      "viewer",
    ]);

    const { accessible } = await getMembershipAndAccessible(
      ctx,
      analysis.workspaceId,
      user.clerkUserId,
    );

    try {
      const { baseline, impact, truncated } = await collectBaselineAndImpactEvents(
        ctx,
        analysis.workspaceId,
        analysis.window,
        {
          projectId: analysis.projectId,
          filters: analysis.filters,
          accessibleProjects: accessible,
        },
      );

      const workstreams = await listWorkstreamsForInsight(ctx, analysis.workspaceId, {
        projectId: analysis.projectId,
      });
      const filteredWorkstreams = workstreams.filter((ws) =>
        canViewWorkstream(ws, accessible),
      );

      const baselineWorkstreams = filteredWorkstreams.filter(
        (ws) =>
          ws.startedAt >= analysis.window.baselineStart &&
          ws.startedAt < analysis.window.baselineEnd,
      );
      const impactWorkstreams = filteredWorkstreams.filter(
        (ws) =>
          ws.startedAt >= analysis.window.impactStart &&
          ws.startedAt < analysis.window.impactEnd,
      );

      const metrics = computeMetricsWithDelta(
        baseline,
        impact,
        baselineWorkstreams,
        impactWorkstreams,
      );

      let findings = generateAllImpactFindings(metrics, baseline, impact);

      const anchorEventIds: Id<"events">[] = [];
      if (analysis.anchor.eventId) {
        anchorEventIds.push(analysis.anchor.eventId);
      }
      await addRelatedWorkFindings(ctx, findings, anchorEventIds);

      const eventProjectMap = new Map<string, Id<"projects"> | undefined>();
      for (const event of [...baseline, ...impact]) {
        eventProjectMap.set(event.id, event.projectId as Id<"projects"> | undefined);
      }
      const workstreamProjectMap = new Map<string, Id<"projects"> | undefined>();
      for (const ws of filteredWorkstreams) {
        workstreamProjectMap.set(ws.id, ws.projectId as Id<"projects"> | undefined);
      }

      findings = findings
        .map((finding) =>
          filterFindingEvidence(finding, accessible, eventProjectMap, workstreamProjectMap),
        )
        .filter(
          (finding) =>
            (finding.evidenceEventIds?.length ?? 0) > 0 ||
            (finding.evidenceWorkstreamIds?.length ?? 0) > 0 ||
            (finding.evidenceEntityIds?.length ?? 0) > 0 ||
            finding.type === "other",
        );

      const generatedSummary = buildDeterministicImpactSummary({
        anchorTitle: analysis.anchor.title,
        beforeMs: analysis.window.beforeMs,
        afterMs: analysis.window.afterMs,
        metrics,
        findings,
        truncated,
      });

      await deleteFindingsForAnalysis(ctx, args.analysisId);
      for (const finding of findings) {
        await insertImpactFindingDoc(ctx, {
          workspaceId: analysis.workspaceId,
          analysisId: args.analysisId,
          finding,
        });
      }

      await completeImpactAnalysisDoc(ctx, {
        analysisId: args.analysisId,
        metrics,
        generatedSummary,
      });

      await recordImpactAnalysisEvent(ctx, {
        workspaceId: analysis.workspaceId,
        analysisId: args.analysisId,
        title: `Impact analysis generated: ${analysis.title}`,
        actor: {
          type: "human",
          name: user.name ?? user.email ?? "User",
          email: user.email,
          id: user.clerkUserId,
        },
      });

      return { status: "generated" as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      await failImpactAnalysisDoc(ctx, args.analysisId, message);
      throw err;
    }
  },
});

export const getById = query({
  args: {
    analysisId: v.id("impactAnalyses"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) {
      return null;
    }

    const workspace = await ctx.db.get(analysis.workspaceId);
    if (!workspace) {
      return null;
    }

    await assertWorkspaceBrowseAccess(ctx, workspace.externalId, user.clerkUserId);

    const findings = await listFindingsForAnalysis(ctx, args.analysisId);
    return {
      analysis: docToImpactAnalysis(analysis),
      findings,
    };
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    return listImpactAnalysesForWorkspace(ctx, workspace._id, args.limit ?? 20);
  },
});

export const listByProject = query({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );

    const docs = await ctx.db
      .query("impactAnalyses")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(args.limit ?? 20);

    return docs
      .filter((doc) => doc.workspaceId === workspace._id && doc.status !== "archived")
      .map(docToImpactAnalysis);
  },
});

export const listForAnchor = query({
  args: {
    workspaceId: v.string(),
    anchorType: v.union(
      v.literal("event"),
      v.literal("workstream"),
      v.literal("project"),
      v.literal("view"),
      v.literal("entity"),
    ),
    anchorId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );

    const docs = await ctx.db
      .query("impactAnalyses")
      .withIndex("by_workspace_created_at", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .take(args.limit ?? 10);

    return docs
      .filter((doc) => {
        if (doc.status === "archived") return false;
        switch (args.anchorType) {
          case "event":
            return doc.anchor.eventId === args.anchorId;
          case "workstream":
            return doc.anchor.workstreamId === args.anchorId;
          case "project":
            return doc.anchor.projectId === args.anchorId;
          case "view":
            return doc.anchor.viewId === args.anchorId;
          case "entity":
            return doc.anchor.entityId === args.anchorId;
          default:
            return false;
        }
      })
      .map(docToImpactAnalysis);
  },
});

export const listFindings = query({
  args: {
    analysisId: v.id("impactAnalyses"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) {
      return [];
    }

    const workspace = await ctx.db.get(analysis.workspaceId);
    if (!workspace) {
      return [];
    }

    await assertWorkspaceBrowseAccess(ctx, workspace.externalId, user.clerkUserId);
    return listFindingsForAnalysis(ctx, args.analysisId);
  },
});

export const archive = mutation({
  args: {
    analysisId: v.id("impactAnalyses"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) {
      throw new Error("Impact analysis not found");
    }

    const workspace = await ctx.db.get(analysis.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);

    await ctx.db.patch(args.analysisId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

export const deleteDraft = mutation({
  args: {
    analysisId: v.id("impactAnalyses"),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) {
      throw new Error("Impact analysis not found");
    }
    if (analysis.status !== "draft") {
      throw new Error("Only draft analyses can be deleted");
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

    await deleteFindingsForAnalysis(ctx, args.analysisId);
    await ctx.db.delete(args.analysisId);
  },
});

export type ImpactAnalysisDetail = {
  analysis: ReturnType<typeof docToImpactAnalysis>;
  findings: ImpactFindingRecord[];
};
