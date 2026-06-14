import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { resolveIngestWorkspace } from "./lib/ingestAuth";
import { createArtifact as insertArtifact } from "./lib/artifactMutations";
import { insertEvent } from "./lib/eventsLib";
import { createWorkstream, finishWorkstream as completeWorkstream } from "./lib/workstreamMutations";
import {
  actorValidator,
  createdByValidator,
  entityValidator,
  eventCategoryValidator,
  eventSourceValidator,
  severityValidator,
  artifactTypeValidator,
} from "./lib/validators";

const DEFAULT_AGENT_ACTOR = {
  type: "agent" as const,
  name: "Cursor Agent",
};

function toEventActor(createdBy?: { type: "agent" | "human" | "system"; id?: string; name?: string }) {
  if (!createdBy) return DEFAULT_AGENT_ACTOR;
  return {
    type: createdBy.type,
    name: createdBy.name ?? (createdBy.type === "agent" ? "Cursor Agent" : undefined),
    id: createdBy.id,
  };
}

const ingestAuthArgs = {
  ingestKey: v.optional(v.string()),
  apiKeyId: v.optional(v.id("apiKeys")),
  workspaceId: v.string(),
};

export const startWorkstream = mutation({
  args: {
    ...ingestAuthArgs,
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    summary: v.optional(v.string()),
    actor: v.optional(createdByValidator),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);
    const actor = args.actor ?? DEFAULT_AGENT_ACTOR;

    const workstreamId = await createWorkstream(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      title: args.title,
      summary: args.summary,
      createdBy: actor,
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId,
      source: "cursor",
      category: "agent_action",
      type: "agent.workstream_started",
      actor: toEventActor(actor),
      title: args.title,
      summary: args.summary,
    });

    return { workstreamId };
  },
});

export const finishWorkstream = mutation({
  args: {
    ...ingestAuthArgs,
    workstreamId: v.id("workstreams"),
    projectId: v.optional(v.id("projects")),
    summary: v.optional(v.string()),
    outcome: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);

    await completeWorkstream(ctx, {
      workstreamId: args.workstreamId,
      workspaceId: workspace._id,
      summary: args.summary,
      outcome: args.outcome,
    });

    const finishSummary = args.summary ?? args.outcome;

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      source: "cursor",
      category: "agent_action",
      type: "agent.workstream_completed",
      actor: DEFAULT_AGENT_ACTOR,
      title: "Completed workstream",
      summary: finishSummary,
    });

    return { success: true as const };
  },
});

export const recordEvent = mutation({
  args: {
    ...ingestAuthArgs,
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    source: eventSourceValidator,
    category: eventCategoryValidator,
    type: v.string(),
    actor: actorValidator,
    title: v.string(),
    summary: v.optional(v.string()),
    entity: v.optional(entityValidator),
    artifactIds: v.optional(v.array(v.id("artifacts"))),
    data: v.optional(v.any()),
    severity: v.optional(severityValidator),
    tags: v.optional(v.array(v.string())),
    occurredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);

    const eventId = await insertEvent(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      source: args.source,
      category: args.category,
      type: args.type,
      actor: args.actor,
      title: args.title,
      summary: args.summary,
      entity: args.entity,
      artifactIds: args.artifactIds,
      data: args.data,
      severity: args.severity,
      tags: args.tags,
      occurredAt: args.occurredAt,
    });

    return { eventId };
  },
});

export const createArtifact = mutation({
  args: {
    ...ingestAuthArgs,
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    type: artifactTypeValidator,
    title: v.string(),
    summary: v.optional(v.string()),
    url: v.optional(v.string()),
    content: v.optional(v.string()),
    metadata: v.optional(v.any()),
    sizeBytes: v.optional(v.number()),
    language: v.optional(v.string()),
    filePath: v.optional(v.string()),
    truncated: v.optional(v.boolean()),
    emitEvent: v.optional(v.boolean()),
    actor: v.optional(actorValidator),
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);

    const artifactId = await insertArtifact(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      workstreamId: args.workstreamId,
      type: args.type,
      title: args.title,
      summary: args.summary,
      url: args.url,
      content: args.content,
      metadata: args.metadata,
      sizeBytes: args.sizeBytes,
      language: args.language,
      filePath: args.filePath,
      truncated: args.truncated,
    });

    if (args.emitEvent !== false) {
      await insertEvent(ctx, {
        workspaceId: workspace._id,
        projectId: args.projectId,
        workstreamId: args.workstreamId,
        source: "cursor",
        category: "agent_action",
        type: "artifact.created",
        actor: args.actor ?? DEFAULT_AGENT_ACTOR,
        title: `Attached artifact: ${args.title}`,
        summary: args.summary,
        artifactIds: [artifactId],
      });
    }

    return { artifactId };
  },
});

const MCP_SMOKE_TEST_TITLE = "MCP smoke test";

const SMOKE_TEST_FOLLOW_UP_EVENTS = [
  {
    source: "cursor" as const,
    category: "agent_action" as const,
    type: "agent.plan_created",
    title: "Outlined replay verification steps",
    summary:
      "Plan: list workstreams, open replay, confirm chronological events, check Timeline link.",
    offsetMs: 60_000,
  },
  {
    source: "cursor" as const,
    category: "code_change" as const,
    type: "file.changed",
    title: "Added replay event component",
    summary: "Built ReplayEvent and ReplayTimeline for chronological workstream replay.",
    entity: { type: "file" as const, name: "src/components/workstreams/replay-event.tsx" },
    offsetMs: 120_000,
  },
  {
    source: "system" as const,
    category: "system_event" as const,
    type: "build.passed",
    title: "Build passed",
    summary: "Next.js production build completed after workstreams UI changes.",
    offsetMs: 180_000,
  },
  {
    source: "cursor" as const,
    category: "agent_action" as const,
    type: "agent.task_completed",
    title: "Verified replay UI",
    summary: "Confirmed workstream list, detail page, and Timeline View Replay link.",
    offsetMs: 240_000,
  },
];

export const enrichMcpSmokeTest = mutation({
  args: {
    ...ingestAuthArgs,
  },
  handler: async (ctx, args) => {
    const workspace = await resolveIngestWorkspace(ctx, args);

    const workstreams = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    const workstream = workstreams
      .filter((ws) => ws.title === MCP_SMOKE_TEST_TITLE)
      .sort((a, b) => b.startedAt - a.startedAt)[0];

    if (!workstream) {
      throw new Error(`No workstream titled "${MCP_SMOKE_TEST_TITLE}" found`);
    }

    const existingEvents = await ctx.db
      .query("events")
      .withIndex("by_workstream", (q) => q.eq("workstreamId", workstream._id))
      .collect();

    if (existingEvents.length > 1) {
      return {
        workstreamId: workstream._id,
        inserted: 0,
        skipped: true as const,
        message: "Smoke test already has follow-up events",
      };
    }

    let inserted = 0;
    for (const event of SMOKE_TEST_FOLLOW_UP_EVENTS) {
      await insertEvent(ctx, {
        workspaceId: workspace._id,
        workstreamId: workstream._id,
        source: event.source,
        category: event.category,
        type: event.type,
        actor: DEFAULT_AGENT_ACTOR,
        title: event.title,
        summary: event.summary,
        entity: "entity" in event ? event.entity : undefined,
        occurredAt: workstream.startedAt + event.offsetMs,
      });
      inserted += 1;
    }

    return {
      workstreamId: workstream._id,
      inserted,
      skipped: false as const,
    };
  },
});
