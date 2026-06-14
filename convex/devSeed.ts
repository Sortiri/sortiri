import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { assertWorkspaceAccess, insertEvent } from "./lib/eventsLib";
import {
  createWorkstream,
  finishWorkstream,
} from "./lib/workstreamMutations";
import { buildEventSearchText, buildWorkstreamSearchText } from "./lib/search";

function todayAt(hour: number, minute: number): number {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

const SAMPLE_EVENTS = [
  {
    source: "cursor" as const,
    category: "agent_action" as const,
    type: "agent.plan_created",
    actor: { type: "agent" as const, name: "Cursor Agent" },
    title: "Created homepage update plan",
    summary:
      "Planned changes for the hero headline, CTA, and second section copy.",
    occurredAt: todayAt(9, 1),
  },
  {
    source: "cursor" as const,
    category: "code_change" as const,
    type: "file.changed",
    actor: { type: "agent" as const, name: "Cursor Agent" },
    title: "Updated homepage hero",
    summary:
      "Changed the hero headline to The timeline layer for AI-native companies.",
    entity: { type: "file" as const, name: "app/page.tsx" },
    occurredAt: todayAt(9, 4),
  },
  {
    source: "system" as const,
    category: "system_event" as const,
    type: "build.passed",
    actor: { type: "system" as const, name: "Sortiri" },
    title: "Build passed",
    summary: "The project build completed successfully.",
    occurredAt: todayAt(9, 7),
  },
  {
    source: "manual" as const,
    category: "company_decision" as const,
    type: "decision.made",
    actor: { type: "human" as const, name: "Bobby" },
    title: "Changed positioning to company timeline",
    summary:
      "Decided to position Sortiri as the timeline layer for AI-native companies.",
    occurredAt: todayAt(9, 10),
  },
  {
    source: "sdk" as const,
    category: "product_event" as const,
    type: "user.signed_up",
    actor: { type: "customer" as const, id: "user_123" },
    title: "User signed up",
    summary: "A new user joined the workspace.",
    occurredAt: todayAt(9, 12),
  },
];

export const seedTimelineEvents = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, { workspaceId }) => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, workspaceId, userId);
    const now = Date.now();

    for (const sample of SAMPLE_EVENTS) {
      await ctx.db.insert("events", {
        workspaceId: workspace._id,
        source: sample.source,
        category: sample.category,
        type: sample.type,
        actor: sample.actor,
        title: sample.title,
        summary: sample.summary,
        entity: sample.entity,
        occurredAt: sample.occurredAt,
        createdAt: now,
      });
    }

    return { inserted: SAMPLE_EVENTS.length };
  },
});

const SAMPLE_WORKSTREAMS = [
  {
    title: "Homepage hero refresh",
    summary: "Update hero copy and CTA for new positioning.",
    status: "completed" as const,
    createdBy: { type: "agent" as const, name: "Cursor Agent" },
    events: [
      {
        source: "cursor" as const,
        category: "agent_action" as const,
        type: "agent.workstream_started",
        title: "Homepage hero refresh",
        summary: "Update hero copy and CTA for new positioning.",
        offsetMinutes: 0,
      },
      {
        source: "cursor" as const,
        category: "agent_action" as const,
        type: "agent.plan_created",
        title: "Created homepage update plan",
        summary: "Planned changes for hero headline, CTA, and second section.",
        offsetMinutes: 2,
      },
      {
        source: "cursor" as const,
        category: "code_change" as const,
        type: "file.changed",
        title: "Updated homepage hero",
        summary: "Changed hero headline to The timeline layer for AI-native companies.",
        entity: { type: "file" as const, name: "app/page.tsx" },
        offsetMinutes: 5,
      },
      {
        source: "cursor" as const,
        category: "agent_action" as const,
        type: "agent.workstream_completed",
        title: "Completed workstream",
        summary: "Homepage hero refresh shipped.",
        offsetMinutes: 8,
      },
    ],
  },
  {
    title: "Add workstreams replay UI",
    summary: "Build list and detail pages for workstream replays.",
    status: "active" as const,
    createdBy: { type: "agent" as const, name: "Cursor Agent" },
    events: [
      {
        source: "cursor" as const,
        category: "agent_action" as const,
        type: "agent.workstream_started",
        title: "Add workstreams replay UI",
        summary: "Build list and detail pages for workstream replays.",
        offsetMinutes: 15,
      },
      {
        source: "cursor" as const,
        category: "agent_action" as const,
        type: "agent.plan_created",
        title: "Planned Sprint 4 workstreams UI",
        summary: "Convex queries, list page, replay timeline, Timeline linkage.",
        offsetMinutes: 17,
      },
      {
        source: "cursor" as const,
        category: "code_change" as const,
        type: "file.changed",
        title: "Added workstreams list page",
        summary: "Status filters and workstream cards wired to Convex.",
        entity: { type: "file" as const, name: "src/components/workstreams/workstreams-page.tsx" },
        offsetMinutes: 22,
      },
    ],
  },
  {
    title: "Pricing page experiment",
    summary: "Test new tier names and annual discount messaging.",
    status: "archived" as const,
    createdBy: { type: "human" as const, name: "Bobby" },
    events: [
      {
        source: "manual" as const,
        category: "agent_action" as const,
        type: "agent.workstream_started",
        title: "Pricing page experiment",
        summary: "Test new tier names and annual discount messaging.",
        offsetMinutes: 60,
      },
      {
        source: "manual" as const,
        category: "company_decision" as const,
        type: "decision.made",
        title: "Paused pricing experiment",
        summary: "Hold pricing changes until post-launch feedback.",
        offsetMinutes: 45,
      },
    ],
  },
];

export const seedWorkstreams = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, { workspaceId }) => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, workspaceId, userId);
    const baseTime = Date.now();
    let workstreamCount = 0;
    let eventCount = 0;

    for (const sample of SAMPLE_WORKSTREAMS) {
      const startedAt = baseTime - sample.events[0]!.offsetMinutes * 60_000;
      const workstreamId = await createWorkstream(ctx, {
        workspaceId: workspace._id,
        title: sample.title,
        summary: sample.summary,
        createdBy: sample.createdBy,
      });

      await ctx.db.patch(workstreamId, {
        startedAt,
        ...(sample.status === "archived"
          ? { status: "archived" as const, updatedAt: baseTime }
          : {}),
      });

      for (const event of sample.events) {
        const occurredAt = baseTime - event.offsetMinutes * 60_000;
        await insertEvent(ctx, {
          workspaceId: workspace._id,
          workstreamId,
          source: event.source,
          category: event.category,
          type: event.type,
          actor:
            sample.createdBy.type === "human"
              ? { type: "human" as const, name: sample.createdBy.name }
              : { type: "agent" as const, name: "Cursor Agent" },
          title: event.title,
          summary: event.summary,
          ...("entity" in event && event.entity ? { entity: event.entity } : {}),
          occurredAt,
        });
        eventCount += 1;
      }

      if (sample.status === "completed") {
        await finishWorkstream(ctx, {
          workstreamId,
          workspaceId: workspace._id,
          summary: sample.summary,
        });
      }

      workstreamCount += 1;
    }

    return { workstreams: workstreamCount, events: eventCount };
  },
});

export const backfillSearchText = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, { workspaceId }) => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, workspaceId, userId);

    const events = await ctx.db
      .query("events")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    let eventCount = 0;
    for (const event of events) {
      const searchText = buildEventSearchText({
        title: event.title,
        summary: event.summary,
        type: event.type,
        category: event.category,
        source: event.source,
        actor: event.actor,
        entity: event.entity,
        tags: event.tags,
      });
      if (event.searchText !== searchText) {
        await ctx.db.patch(event._id, { searchText });
        eventCount += 1;
      }
    }

    const workstreams = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    let workstreamCount = 0;
    for (const workstream of workstreams) {
      const searchText = buildWorkstreamSearchText({
        title: workstream.title,
        summary: workstream.summary,
        status: workstream.status,
        createdBy: workstream.createdBy,
      });
      if (workstream.searchText !== searchText) {
        await ctx.db.patch(workstream._id, { searchText });
        workstreamCount += 1;
      }
    }

    return { events: eventCount, workstreams: workstreamCount };
  },
});
