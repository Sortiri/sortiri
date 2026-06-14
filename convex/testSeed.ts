import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUser } from "./lib/authz";
import { insertEvent } from "./lib/eventsLib";
import { completeInsightRunDoc, createInsightRunDoc } from "./lib/insightRunsLib";
import { insertPinDoc } from "./lib/pinnedReplaysLib";
import { createWorkstream } from "./lib/workstreamMutations";
import { setActiveId } from "./lib/workspacesLib";
import { ensureOwnerForWorkspace } from "./lib/workspaceMembersLib";

export const TEST_WORKSPACE_NAME = "Sortiri Test Workspace";
export const TEST_PROJECT_NAME = "Test Project Alpha";
export const TEST_WORKSTREAM_TITLE = "Test Workstream Replay";

function assertTestMode(): void {
  if (process.env.SORTIRI_TEST_MODE !== "true") {
    throw new Error("Test seed is only available when SORTIRI_TEST_MODE=true");
  }
}

export const seedTestWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    const iso = new Date().toISOString();

    let workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_userId", (q) => q.eq("userId", user.clerkUserId))
      .collect()
      .then((rows) => rows.find((row) => row.name === TEST_WORKSPACE_NAME) ?? null);

    if (!workspace) {
      const externalId = crypto.randomUUID();
      const workspaceId = await ctx.db.insert("workspaces", {
        externalId,
        userId: user.clerkUserId,
        name: TEST_WORKSPACE_NAME,
        createdAt: iso,
        updatedAt: iso,
      });
      workspace = (await ctx.db.get(workspaceId))!;
      await ensureOwnerForWorkspace(ctx, workspaceId, user);
    } else {
      await ensureOwnerForWorkspace(ctx, workspace._id, user);
    }

    await setActiveId(ctx, user.clerkUserId, workspace.externalId);

    let project = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace!._id))
      .collect()
      .then((rows) => rows.find((row) => row.name === TEST_PROJECT_NAME) ?? null);

    if (!project) {
      const projectId = await ctx.db.insert("projects", {
        workspaceId: workspace._id,
        name: TEST_PROJECT_NAME,
        status: "active",
        eventCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      project = (await ctx.db.get(projectId))!;
    }

    const workstream = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.title === TEST_WORKSTREAM_TITLE) ?? null);

    const workstreamId =
      workstream?._id ??
      (await createWorkstream(ctx, {
        workspaceId: workspace._id,
        projectId: project._id,
        title: TEST_WORKSTREAM_TITLE,
        summary: "Seeded replay for automated tests",
        createdBy: { type: "agent", name: "Cursor Agent" },
      }));

    const existingEventCount = await ctx.db
      .query("events")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.filter((row) => row.title === "Test PR #42").length);

    if (existingEventCount > 0) {
      return {
        workspaceId: workspace.externalId,
        projectName: TEST_PROJECT_NAME,
        workstreamTitle: TEST_WORKSTREAM_TITLE,
      };
    }

    const seededEvents = [
      {
        source: "cursor" as const,
        category: "agent_action" as const,
        type: "agent.plan_created",
        title: "MCP plan created",
        summary: "Seeded agent action",
      },
      {
        source: "watcher" as const,
        category: "code_change" as const,
        type: "file.changed",
        title: "Watcher changed app/page.tsx",
        entity: { type: "file" as const, name: "app/page.tsx" },
      },
      {
        source: "cli" as const,
        category: "system_event" as const,
        type: "command.failed",
        title: "Test Command Failed",
        summary: "Seeded command failure",
        severity: "error" as const,
      },
      {
        source: "sdk" as const,
        category: "product_event" as const,
        type: "user.signed_up",
        title: "User signed up",
        actor: { type: "customer" as const, id: "cus_test_123", name: "Test Customer" },
      },
      {
        source: "sdk" as const,
        category: "revenue_event" as const,
        type: "payment.received",
        title: "Payment received",
        actor: { type: "customer" as const, id: "cus_test_123" },
      },
      {
        source: "github" as const,
        category: "code_change" as const,
        type: "github.pull_request.opened",
        title: "Test PR #42",
        entity: { type: "pull_request" as const, name: "#42 Test PR" },
      },
    ];

    for (let i = 0; i < seededEvents.length; i += 1) {
      const sample = seededEvents[i]!;
      await insertEvent(ctx, {
        workspaceId: workspace._id,
        projectId: project._id,
        workstreamId: i < 2 ? workstreamId : undefined,
        source: sample.source,
        category: sample.category,
        type: sample.type,
        actor:
          "actor" in sample && sample.actor
            ? sample.actor
            : { type: "system", name: "Sortiri Test" },
        title: sample.title,
        summary: "summary" in sample ? sample.summary : undefined,
        entity: "entity" in sample ? sample.entity : undefined,
        severity: "severity" in sample ? sample.severity : undefined,
        occurredAt: now - (seededEvents.length - i) * 60_000,
      });
    }

    const windowEnd = now;
    const windowStart = now - 7 * 24 * 60 * 60 * 1000;
    const runId = await createInsightRunDoc(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      title: "Test insight run",
      windowStart,
      windowEnd,
      generatedBy: { type: "system", name: "Test Seed" },
    });
    await completeInsightRunDoc(ctx, {
      runId,
      summary: "Seeded insight run for tests",
      eventCount: seededEvents.length,
      workstreamCount: 1,
    });

    const existingPin = await ctx.db
      .query("pinnedReplays")
      .withIndex("by_workspace_workstream", (q) =>
        q.eq("workspaceId", workspace._id).eq("workstreamId", workstreamId),
      )
      .first();

    if (!existingPin) {
      await insertPinDoc(ctx, {
        workspaceId: workspace._id,
        workstreamId,
        label: "Test pin",
      });
    }

    return {
      workspaceId: workspace.externalId,
      projectName: TEST_PROJECT_NAME,
      workstreamTitle: TEST_WORKSTREAM_TITLE,
    };
  },
});

export const clearTestWorkspace = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, { workspaceId }) => {
    assertTestMode();
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_externalId", (q) => q.eq("externalId", workspaceId))
      .unique();
    if (!workspace || workspace.name !== TEST_WORKSPACE_NAME) {
      throw new Error("Test workspace not found");
    }

    const workspaceDocId = workspace._id;

    for (const table of [
      "insightFindings",
      "insightRuns",
      "events",
      "workstreams",
      "projects",
      "pinnedReplays",
      "entities",
      "workspaceInvites",
      "workspaceMembers",
    ] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceDocId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }

    await ctx.db.delete(workspaceDocId);
    return { ok: true };
  },
});
