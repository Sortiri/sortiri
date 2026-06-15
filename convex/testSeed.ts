import { v } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/authz";
import { insertEvent } from "./lib/eventsLib";
import { completeInsightRunDoc, createInsightRunDoc } from "./lib/insightRunsLib";
import { insertPinDoc } from "./lib/pinnedReplaysLib";
import { createWorkstream } from "./lib/workstreamMutations";
import { setActiveId } from "./lib/workspacesLib";
import { ensureOwnerForWorkspace } from "./lib/workspaceMembersLib";
import { upsertProjectAccess } from "./lib/projectAccessLib";
import {
  collectEvidenceFromScope,
  replaceReportItems,
} from "./lib/auditReportsLib";
import { createArtifact } from "./lib/artifactMutations";
import { upsertReportAccess } from "./lib/auditReportAccessLib";
import { getWindowBounds } from "./lib/insightWindow";
import {
  generateShareToken,
  getTokenLast4,
  hashShareToken,
} from "./lib/auditShareLib";
import { SHARE_TOKEN_PREFIX } from "../src/types/audit-sharing";
import {
  createIntegrationSecretDoc,
  revokeActiveIntegrationSecrets,
} from "./lib/integrationSecretsLib";
import {
  upsertIntegrationConnection,
} from "./lib/integrationConnectionsLib";
import { encryptSecret } from "./lib/secretsLib";
import { createWebhookSecretDoc, revokeActiveSecretsForWorkspace } from "./lib/githubWebhookSecretsLib";
import { saveEncryptedIntegrationSecret } from "./lib/integrationSharedLib";
import {
  completeImpactAnalysisDoc,
  createImpactAnalysisDoc,
  insertImpactFindingDoc,
  listFindingsForAnalysis,
} from "./lib/impactAnalysesLib";
import {
  docToLesson,
  createLessonDoc,
  hasLessonWithTag,
} from "./lib/lessonsLib";
import { collectBaselineAndImpactEvents } from "./lib/impactData";
import { generateAllImpactFindings } from "./lib/impactFindings";
import { computeMetricsWithDelta } from "./lib/impactMetrics";
import { buildDeterministicImpactSummary } from "./lib/impactSummary";
import {
  computeWindowFromAnchor,
  DEFAULT_AFTER_MS,
  DEFAULT_BEFORE_MS,
} from "./lib/impactWindows";
import {
  impactFindingDedupTag,
  lessonFromImpactFinding,
} from "./lib/lessonGeneration";
import { generatePlaybookFromLessons } from "./lib/playbookGeneration";
import { createPlaybookDoc } from "./lib/playbooksLib";
import { createContextPackDoc } from "./lib/contextPackLib";
import { generateContextPackItems } from "./lib/contextPackGeneration";
import { getWorkspaceMembership } from "./lib/authz";
import { getAccessibleProjectIds } from "./lib/projectAccessLib";
import {
  collectAllDraftRecommendations,
  insertDraftRecommendations,
} from "./lib/recommendationEngine";
import {
  loadLessonDraft,
  loadPlaybookDraft,
  loadRecommendationDraft,
} from "./lib/evalGeneration";
import { insertDraftEvalSuite, createEvalSuiteDoc, createEvalCaseDoc } from "./lib/evalLib";

export const TEST_SHARE_TOKEN =
  "share_sortiri_e2e000000000000000000000000000000000000000000000000000000";

export const TEST_STRIPE_WEBHOOK_SECRET = "whsec_test_sortiri_e2e_secret_value";

export const TEST_POSTHOG_WEBHOOK_SECRET =
  "phsec_sortiri_e2e000000000000000000000000000000000000000000000000000000";

export const TEST_GITHUB_WEBHOOK_SECRET =
  "whsec_sortiri_e2e000000000000000000000000000000000000000000000000000000";

export const TEST_WORKSPACE_NAME = "Sortiri Test Workspace";
export const TEST_PROJECT_NAME = "Test Project Alpha";
export const TEST_PROJECT_BETA = "Test Project Beta";
export const TEST_WORKSTREAM_TITLE = "Test Workstream Replay";

function assertTestMode(): void {
  if (process.env.SORTIRI_TEST_MODE !== "true") {
    throw new Error("Test seed is only available when SORTIRI_TEST_MODE=true");
  }
}

async function findTestWorkspace(ctx: { db: MutationCtx["db"] }) {
  const workspaces = await ctx.db.query("workspaces").collect();
  return workspaces.find((row) => row.name === TEST_WORKSPACE_NAME) ?? null;
}

async function ensureActiveWorkspaceMember(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  role: "owner" | "admin" | "member" | "viewer" | "auditor",
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("clerkUserId", user.clerkUserId),
    )
    .unique();

  if (!existing) {
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      clerkUserId: user.clerkUserId,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
      role,
      status: "active",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  if (existing.status !== "active" || existing.role !== role) {
    await ctx.db.patch(existing._id, {
      status: "active",
      role,
      updatedAt: now,
    });
  }
}

export const seedTestWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    const iso = new Date().toISOString();

    let workspace = await findTestWorkspace(ctx);

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
    } else if (workspace.userId === user.clerkUserId) {
      await ensureActiveWorkspaceMember(ctx, workspace._id, user, "owner");
    } else {
      const workspaceDoc = workspace;
      const existing = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_user", (q) =>
          q.eq("workspaceId", workspaceDoc._id).eq("clerkUserId", user.clerkUserId),
        )
        .unique();
      if (!existing) {
        await ensureActiveWorkspaceMember(ctx, workspaceDoc._id, user, "owner");
      }
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

    let betaProject = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.name === TEST_PROJECT_BETA) ?? null);

    if (!betaProject) {
      const betaProjectId = await ctx.db.insert("projects", {
        workspaceId: workspace._id,
        name: TEST_PROJECT_BETA,
        status: "active",
        eventCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      betaProject = (await ctx.db.get(betaProjectId))!;
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

    const existingBetaEventCount = await ctx.db
      .query("events")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.filter((row) => row.title === "Test PR Beta").length);

    if (existingBetaEventCount === 0) {
      await insertEvent(ctx, {
        workspaceId: workspace._id,
        projectId: betaProject._id,
        source: "github",
        category: "code_change",
        type: "github.pull_request.opened",
        actor: { type: "system", name: "Sortiri Test" },
        title: "Test PR Beta",
        entity: { type: "pull_request", name: "#99 Beta PR" },
        occurredAt: now - 30_000,
      });
    }

    if (existingEventCount > 0) {
      return {
        workspaceId: workspace.externalId,
        projectName: TEST_PROJECT_NAME,
        betaProjectName: TEST_PROJECT_BETA,
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
      betaProjectName: TEST_PROJECT_BETA,
      workstreamTitle: TEST_WORKSTREAM_TITLE,
    };
  },
});

export const bootstrapTestMember = mutation({
  args: {},
  handler: async (ctx) => {
    return bootstrapTestWorkspaceUserHandler(ctx, {
      workspaceRole: "member",
      projectName: TEST_PROJECT_NAME,
      accessLevel: "viewer",
    });
  },
});

export const bootstrapTestAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    return bootstrapTestWorkspaceUserHandler(ctx, {
      workspaceRole: "admin",
    });
  },
});

export const bootstrapTestViewer = mutation({
  args: {},
  handler: async (ctx) => {
    return bootstrapTestWorkspaceUserHandler(ctx, {
      workspaceRole: "viewer",
      projectName: TEST_PROJECT_NAME,
      accessLevel: "viewer",
    });
  },
});

export const bootstrapTestAuditor = mutation({
  args: {},
  handler: async (ctx) => {
    return bootstrapTestWorkspaceUserHandler(ctx, {
      workspaceRole: "auditor",
    });
  },
});

export const seedSensitiveArtifact = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const user = await getCurrentUser(ctx);
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace as owner first");
    }

    const workstream = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.title === TEST_WORKSTREAM_TITLE) ?? rows[0]);

    const artifactId = await createArtifact(ctx, {
      workspaceId: workspace._id,
      workstreamId: workstream?._id,
      type: "log",
      title: "Sensitive test artifact",
      summary: "Contains a fake Stripe key for evidence safety tests",
      content: "DEMO_CONFIG_VALUE=placeholder_value_for_tests",
    });

    const artifact = await ctx.db.get(artifactId);
    return {
      workspaceId: workspace.externalId,
      artifactId,
      redactionStatus: artifact?.redactionStatus,
      safeForAudit: artifact?.safeForAudit,
      seededBy: user.clerkUserId,
    };
  },
});

export const seedBlockedArtifact = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace as owner first");
    }

    const workstream = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.title === TEST_WORKSTREAM_TITLE) ?? rows[0]);

    const artifactId = await createArtifact(ctx, {
      workspaceId: workspace._id,
      workstreamId: workstream?._id,
      type: "log",
      title: "Blocked test artifact",
      summary: "Blocked from audit export for E2E tests",
      content: "password=blocked-test-secret",
    });

    await ctx.db.patch(artifactId, {
      redactionStatus: "blocked",
      safeForAudit: false,
      sensitivity: "restricted",
    });

    const artifact = await ctx.db.get(artifactId);

    return {
      workspaceId: workspace.externalId,
      artifactId,
      redactionStatus: artifact?.redactionStatus,
      safeForAudit: artifact?.safeForAudit,
    };
  },
});

export const seedAuditReportWithEvidence = mutation({
  args: {
    auditorEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertTestMode();
    const user = await getCurrentUser(ctx);
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace as owner first");
    }

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspace._id).eq("clerkUserId", user.clerkUserId),
      )
      .unique();
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Only workspace owner/admin can seed audit reports");
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.name === TEST_PROJECT_NAME) ?? null);
    if (!project) {
      throw new Error("Test project not found");
    }

    const { windowStart, windowEnd } = getWindowBounds("7d");
    const now = Date.now();

    const reportId = await ctx.db.insert("auditReports", {
      workspaceId: workspace._id,
      title: "E2E Audit Report",
      summary: "Seeded audit report for automated tests",
      status: "draft",
      scope: {
        projectIds: [project._id],
        windowStart,
        windowEnd,
        visibility: "primary",
      },
      createdBy: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
      createdAt: now,
      updatedAt: now,
    });

    const report = (await ctx.db.get(reportId))!;
    const evidence = await collectEvidenceFromScope(
      ctx,
      workspace._id,
      report.scope,
      "all",
      user.clerkUserId,
    );

    await replaceReportItems(ctx, report._id, workspace._id, evidence.items);
    await ctx.db.patch(report._id, {
      snapshotEventIds: evidence.eventIds,
      snapshotWorkstreamIds: evidence.workstreamIds,
      snapshotArtifactIds: evidence.artifactIds,
      snapshotEntityIds: evidence.entityIds,
      generatedSummary: evidence.generatedSummary,
      safetySummary: evidence.safetySummary,
      status: "finalized",
      finalizedAt: now,
      updatedAt: now,
    });

    let grantedMemberId: Id<"workspaceMembers"> | undefined;
    if (args.auditorEmail) {
      const auditorMember = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
        .collect()
        .then(
          (rows) =>
            rows.find(
              (row) =>
                row.email?.toLowerCase() === args.auditorEmail!.toLowerCase() &&
                row.role === "auditor",
            ) ?? null,
        );
      if (auditorMember) {
        await upsertReportAccess(ctx, {
          workspaceId: workspace._id,
          reportId: report._id,
          memberId: auditorMember._id,
          accessLevel: "viewer",
          grantedBy: {
            clerkUserId: user.clerkUserId,
            email: user.email,
            name: user.name,
          },
        });
        grantedMemberId = auditorMember._id;
      }
    }

    return {
      workspaceId: workspace.externalId,
      reportId: report._id,
      artifactId: evidence.artifactIds[0],
      eventCount: evidence.eventIds.length,
      grantedMemberId,
    };
  },
});

async function bootstrapTestWorkspaceUserHandler(
  ctx: MutationCtx,
  args: {
    workspaceRole: "admin" | "member" | "viewer" | "auditor";
    projectName?: string;
    accessLevel?: "owner" | "manager" | "editor" | "viewer";
  },
) {
  assertTestMode();
  const user = await getCurrentUser(ctx);
  const workspace = await findTestWorkspace(ctx);
  if (!workspace) {
    throw new Error("Test workspace not found — run seedTestWorkspace as owner first");
  }

  const now = Date.now();
  let member = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspace._id).eq("clerkUserId", user.clerkUserId),
    )
    .unique();

  if (!member) {
    const memberId = await ctx.db.insert("workspaceMembers", {
      workspaceId: workspace._id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
      role: args.workspaceRole,
      status: "active",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    member = (await ctx.db.get(memberId))!;
  } else {
    if (member.status !== "active" || member.role !== args.workspaceRole) {
      await ctx.db.patch(member._id, {
        role: args.workspaceRole,
        status: "active",
        updatedAt: now,
      });
      member = (await ctx.db.get(member._id))!;
    }
  }

  if (args.projectName) {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.name === args.projectName) ?? null);
    if (!project) {
      throw new Error("Project not found");
    }

    await upsertProjectAccess(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      memberId: member._id,
      accessLevel: args.accessLevel ?? "viewer",
    });
  }

  await setActiveId(ctx, user.clerkUserId, workspace.externalId);

  return {
    workspaceId: workspace.externalId,
    projectName: args.projectName,
    memberId: member._id,
    role: args.workspaceRole,
  };
}

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

    const auditReports = await ctx.db
      .query("auditReports")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceDocId))
      .collect();
    for (const report of auditReports) {
      const items = await ctx.db
        .query("auditReportItems")
        .withIndex("by_report", (q) => q.eq("reportId", report._id))
        .collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      const accessRows = await ctx.db
        .query("auditReportAccess")
        .withIndex("by_report", (q) => q.eq("reportId", report._id))
        .collect();
      for (const row of accessRows) {
        await ctx.db.delete(row._id);
      }
      await ctx.db.delete(report._id);
    }

    for (const table of [
      "projectAccess",
      "insightFindings",
      "savedViews",
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

export const seedMemberProjectAccess = mutation({
  args: {
    workspaceId: v.string(),
    clerkUserId: v.string(),
    projectName: v.optional(v.string()),
    accessLevel: v.optional(
      v.union(
        v.literal("owner"),
        v.literal("manager"),
        v.literal("editor"),
        v.literal("viewer"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    assertTestMode();
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.workspaceId))
      .unique();
    if (!workspace) {
      throw new Error("Test workspace not found");
    }

    const member = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspace._id).eq("clerkUserId", args.clerkUserId),
      )
      .unique();
    if (!member) {
      throw new Error("Member not found");
    }

    const projectName = args.projectName ?? TEST_PROJECT_NAME;
    const project = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.name === projectName) ?? null);
    if (!project) {
      throw new Error("Project not found");
    }

    await upsertProjectAccess(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      memberId: member._id,
      accessLevel: args.accessLevel ?? "viewer",
    });

    return { projectId: project._id, memberId: member._id };
  },
});

export const seedAuditShareLink = mutation({
  args: {
    reportId: v.optional(v.id("auditReports")),
    rawToken: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("revoked"), v.literal("expired")),
    ),
    expiresInMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertTestMode();
    const user = await getCurrentUser(ctx);
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found");
    }

    let reportId = args.reportId;
    if (!reportId) {
      const report = await ctx.db
        .query("auditReports")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
        .collect()
        .then((rows) => rows.find((row) => row.title === "E2E Audit Report") ?? rows[0]);
      if (!report) {
        throw new Error("No audit report found — seed audit report first");
      }
      reportId = report._id;
    }

    const report = await ctx.db.get(reportId);
    if (!report || report.status !== "finalized") {
      throw new Error("Report must be finalized");
    }

    const rawToken = args.rawToken ?? generateShareToken();
    const tokenHash = await hashShareToken(rawToken);
    const now = Date.now();

    const existing = await ctx.db
      .query("auditShareLinks")
      .withIndex("by_token_prefix", (q) => q.eq("tokenPrefix", SHARE_TOKEN_PREFIX))
      .collect();
    for (const row of existing) {
      if (row.tokenHash === tokenHash) {
        await ctx.db.delete(row._id);
      }
    }

    const expiresInMs = args.expiresInMs ?? 7 * 24 * 60 * 60 * 1000;
    const status = args.status ?? "active";
    const expiresAt =
      status === "expired" ? now - 60_000 : now + expiresInMs;

    const shareLinkId = await ctx.db.insert("auditShareLinks", {
      workspaceId: workspace._id,
      reportId: report._id,
      tokenHash,
      tokenPrefix: SHARE_TOKEN_PREFIX,
      last4: getTokenLast4(rawToken),
      status,
      expiresAt,
      createdBy: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
      accessCount: 0,
      createdAt: now,
      updatedAt: now,
      revokedAt: status === "revoked" ? now : undefined,
    });

    return {
      shareLinkId,
      reportId: report._id,
      rawToken,
      shareUrl: `/share/audit/${rawToken}`,
      status,
    };
  },
});

export const seedStripeWebhookSecret = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace first");
    }

    await revokeActiveIntegrationSecrets(ctx, workspace._id, "stripe");
    const encryptedSecret = await encryptSecret(TEST_STRIPE_WEBHOOK_SECRET);
    const connectionId = await upsertIntegrationConnection(ctx, {
      workspaceId: workspace._id,
      source: "stripe",
      name: "Stripe",
      status: "connected",
    });

    await createIntegrationSecretDoc(ctx, {
      workspaceId: workspace._id,
      connectionId,
      source: "stripe",
      name: "Stripe webhook signing secret",
      encryptedSecret,
      secretLast4: TEST_STRIPE_WEBHOOK_SECRET.slice(-4),
    });

    return {
      workspaceId: workspace.externalId,
      webhookSecret: TEST_STRIPE_WEBHOOK_SECRET,
    };
  },
});

export const seedStripeRevenueEvent = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace first");
    }

    const eventId = await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "stripe",
      category: "revenue_event",
      type: "stripe.payment_intent.succeeded",
      actor: {
        type: "customer",
        id: "cus_e2e_stripe",
        name: "stripe-e2e@sortiri.dev",
        email: "stripe-e2e@sortiri.dev",
      },
      title: "Payment succeeded",
      summary: "Payment succeeded for 99.00 USD.",
      entity: {
        type: "payment",
        id: "pi_e2e_stripe",
        name: "Payment pi_e2e_stripe",
        url: "https://dashboard.stripe.com/test/payments/pi_e2e_stripe",
      },
      data: {
        stripeEventId: "evt_e2e_stripe",
        paymentIntentId: "pi_e2e_stripe",
        customerId: "cus_e2e_stripe",
        amount: 99,
        amountCents: 9900,
        currency: "usd",
        livemode: false,
      },
      importance: "high",
      visibility: "primary",
    });

    return { eventId, workspaceId: workspace.externalId };
  },
});

export const seedPostHogWebhookSecret = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace first");
    }

    await revokeActiveIntegrationSecrets(ctx, workspace._id, "posthog");
    const encryptedSecret = await encryptSecret(TEST_POSTHOG_WEBHOOK_SECRET);
    const connectionId = await upsertIntegrationConnection(ctx, {
      workspaceId: workspace._id,
      source: "posthog",
      name: "PostHog",
      status: "connected",
    });

    await createIntegrationSecretDoc(ctx, {
      workspaceId: workspace._id,
      connectionId,
      source: "posthog",
      name: "PostHog webhook secret",
      encryptedSecret,
      secretLast4: TEST_POSTHOG_WEBHOOK_SECRET.slice(-4),
    });

    return {
      workspaceId: workspace.externalId,
      webhookSecret: TEST_POSTHOG_WEBHOOK_SECRET,
    };
  },
});

export const seedPostHogProductEvent = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace first");
    }

    const eventId = await insertEvent(ctx, {
      workspaceId: workspace._id,
      source: "posthog",
      category: "product_event",
      type: "posthog.user.signed_up",
      actor: {
        type: "human",
        id: "user_e2e_posthog",
        name: "posthog-e2e@sortiri.dev",
        email: "posthog-e2e@sortiri.dev",
      },
      title: "User signed up",
      summary: "posthog-e2e@sortiri.dev signed up via PostHog.",
      entity: {
        type: "user",
        id: "user_e2e_posthog",
        name: "posthog-e2e@sortiri.dev",
      },
      data: {
        email: "posthog-e2e@sortiri.dev",
        distinctId: "user_e2e_posthog",
        posthogEventName: "user signed up",
        deliveryId: "posthog:e2e_seed",
      },
      importance: "high",
      visibility: "primary",
    });

    return { eventId, workspaceId: workspace.externalId };
  },
});

export const seedImpactStory = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace first");
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.name === TEST_PROJECT_NAME) ?? null);
    if (!project) {
      throw new Error("Test project not found");
    }

    const anchorTime = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const workstreamId = await createWorkstream(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      title: "Impact Story Workstream",
      summary: "Seeded workstream for impact analysis tests",
      createdBy: { type: "agent", name: "Cursor Agent" },
    });

    await ctx.db.patch(workstreamId, {
      startedAt: anchorTime - 5 * 24 * 60 * 60 * 1000,
      endedAt: anchorTime,
      status: "completed",
      updatedAt: Date.now(),
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      workstreamId,
      source: "cursor",
      category: "agent_action",
      type: "agent.action",
      actor: { type: "agent", name: "Cursor Agent" },
      title: "Agent refactored checkout",
      occurredAt: anchorTime - 4 * 24 * 60 * 60 * 1000,
      visibility: "primary",
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      workstreamId,
      source: "github",
      category: "code_change",
      type: "github.pull_request.merged",
      actor: { type: "human", name: "Engineer" },
      title: "Merged PR #99: checkout improvements",
      occurredAt: anchorTime,
      visibility: "primary",
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      source: "posthog",
      category: "product_event",
      type: "posthog.user.signed_up",
      actor: { type: "human", id: "impact_user", name: "impact@sortiri.dev" },
      title: "User signed up",
      occurredAt: anchorTime + 24 * 60 * 60 * 1000,
      visibility: "primary",
      data: { email: "impact@sortiri.dev", distinctId: "impact_user" },
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      source: "stripe",
      category: "revenue_event",
      type: "stripe.payment_intent.succeeded",
      actor: { type: "customer", name: "impact@sortiri.dev" },
      title: "Payment succeeded",
      occurredAt: anchorTime + 2 * 24 * 60 * 60 * 1000,
      visibility: "primary",
      data: { amount: 49, currency: "usd", customerEmail: "impact@sortiri.dev" },
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      source: "stripe",
      category: "revenue_event",
      type: "stripe.payment_intent.payment_failed",
      actor: { type: "customer", name: "failed@sortiri.dev" },
      title: "Payment failed",
      occurredAt: anchorTime + 3 * 24 * 60 * 60 * 1000,
      visibility: "primary",
      severity: "warning",
      data: { amount: 10, currency: "usd" },
    });

    return { workstreamId, workspaceId: workspace.externalId, anchorTime };
  },
});

export const seedLessonsPlaybooksStory = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace first");
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.name === TEST_PROJECT_NAME) ?? null);
    if (!project) {
      throw new Error("Test project not found");
    }

    const workstream = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.title === "Impact Story Workstream") ?? null);
    if (!workstream) {
      throw new Error("Impact story workstream not found — run seedImpactStory first");
    }

    const anchorTime = workstream.endedAt ?? workstream.startedAt ?? Date.now();
    const window = computeWindowFromAnchor(anchorTime, DEFAULT_BEFORE_MS, DEFAULT_AFTER_MS);
    const analysisId = await createImpactAnalysisDoc(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      title: "Lessons Playbooks Seed Analysis",
      anchor: {
        type: "workstream",
        workstreamId: workstream._id,
        title: workstream.title,
        occurredAt: anchorTime,
      },
      window,
    });

    const { baseline, impact } = await collectBaselineAndImpactEvents(ctx, workspace._id, window, {
      projectId: project._id,
    });
    const metrics = computeMetricsWithDelta(baseline, impact, [], []);
    const findings = generateAllImpactFindings(metrics, baseline, impact);
    for (const finding of findings) {
      await insertImpactFindingDoc(ctx, {
        workspaceId: workspace._id,
        analysisId,
        finding,
      });
    }
    const summary = buildDeterministicImpactSummary({
      anchorTitle: workstream.title,
      beforeMs: window.beforeMs,
      afterMs: window.afterMs,
      metrics,
      findings,
    });
    await completeImpactAnalysisDoc(ctx, {
      analysisId,
      metrics,
      generatedSummary: summary,
    });

    const storedFindings = await listFindingsForAnalysis(ctx, analysisId);
    const lessonIds: Id<"lessons">[] = [];
    for (const finding of storedFindings) {
      const tag = impactFindingDedupTag(finding.id);
      if (await hasLessonWithTag(ctx, workspace._id, tag)) continue;
      const lessonInput = lessonFromImpactFinding(finding, {
        workspaceId: workspace._id,
        projectId: project._id,
        impactAnalysisId: analysisId,
      });
      lessonIds.push(await createLessonDoc(ctx, lessonInput));
    }

    if (lessonIds.length < 2) {
      const fallback = await createLessonDoc(ctx, {
        workspaceId: workspace._id,
        projectId: project._id,
        impactAnalysisId: analysisId,
        title: "Validation pattern noted",
        summary: "Webhook and build validation may help before similar work.",
        type: "validation",
        status: "active",
        confidence: "possible",
        importance: "normal",
        source: "system",
        recommendation: "Run npm run test:unit and webhook validation scripts.",
        tags: ["seed-fallback-lesson"],
      });
      lessonIds.push(fallback);
    }

    const lessons = [];
    for (const lessonId of lessonIds.slice(0, 3)) {
      const doc = await ctx.db.get(lessonId);
      if (doc) {
        lessons.push(docToLesson(doc));
      }
    }

    const playbookInput = generatePlaybookFromLessons({
      workspaceId: workspace._id,
      projectId: project._id,
      lessons,
      lessonIds: lessonIds.slice(0, Math.max(2, lessons.length)) as Id<"lessons">[],
      title: "Stripe webhook validation playbook",
    });
    playbookInput.trigger = "stripe webhook checkout failures validation deploy";
    playbookInput.status = "active";
    const playbookId = await createPlaybookDoc(ctx, playbookInput);

    return {
      impactAnalysisId: analysisId,
      lessonIds,
      playbookId,
      workspaceId: workspace.externalId,
    };
  },
});

export const seedContextPackStory = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace first");
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.name === TEST_PROJECT_NAME) ?? null);
    if (!project) {
      throw new Error("Test project not found");
    }

    const workstream = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.title === "Impact Story Workstream") ?? null);
    if (!workstream) {
      throw new Error("Impact story workstream not found — run seedImpactStory first");
    }

    const playbook = await ctx.db
      .query("playbooks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.title === "Stripe webhook validation playbook") ?? rows[0] ?? null);

    const anchorTime = Date.now();
    await insertEvent(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      workstreamId: workstream._id,
      source: "system",
      category: "system_event",
      type: "command.failed",
      actor: { type: "system", name: "CI" },
      title: "Stripe webhook signature validation failed",
      summary: "Checkout deploy failed webhook validation — rerun stripe webhook tests",
      occurredAt: anchorTime - 2 * 24 * 60 * 60 * 1000,
      visibility: "primary",
      severity: "error",
    });

    await insertEvent(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      workstreamId: workstream._id,
      source: "sdk",
      category: "company_decision",
      type: "decision.made",
      actor: { type: "human", name: "Engineering" },
      title: "Decision: validate Stripe webhooks before checkout deploys",
      summary: "Always run stripe webhook tests before merging checkout changes",
      occurredAt: anchorTime - 24 * 60 * 60 * 1000,
      visibility: "primary",
    });

    const packId = await createContextPackDoc(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      workstreamId: workstream._id,
      playbookId: playbook?._id,
      title: "Seed Agent Context Pack",
      goal: "Improve checkout and Stripe webhook validation",
      status: "generated",
      requestedBy: { type: "system", name: "test-seed", source: "seed" },
      request: {
        files: ["src/app/checkout/page.tsx"],
        timeWindowMs: 30 * 24 * 60 * 60 * 1000,
      },
    });

    await generateContextPackItems(ctx, packId, workspace.userId);

    return {
      contextPackId: packId,
      workspaceId: workspace.externalId,
      projectId: project._id,
      workstreamId: workstream._id,
    };
  },
});

export const seedRecommendationStory = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace first");
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.name === TEST_PROJECT_NAME) ?? null);
    if (!project) {
      throw new Error("Test project not found");
    }

    const workstream = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.title === "Impact Story Workstream") ?? null);
    if (!workstream) {
      throw new Error("Impact story workstream not found — run seedImpactStory first");
    }

    const connectionId = await upsertIntegrationConnection(ctx, {
      workspaceId: workspace._id,
      source: "stripe",
      name: "Stripe",
      status: "error",
    });
    await ctx.db.patch(connectionId, {
      metadata: { lastError: "Webhook delivery failed in sanity seed" },
      updatedAt: Date.now(),
    });

    const anchorTime = Date.now();
    for (let i = 0; i < 3; i += 1) {
      await insertEvent(ctx, {
        workspaceId: workspace._id,
        projectId: project._id,
        workstreamId: workstream._id,
        source: "system",
        category: "system_event",
        type: "command.failed",
        actor: { type: "system", name: "CI" },
        title: `Repeated validation failure ${i + 1}`,
        summary: "npm run test:all failed during checkout validation",
        occurredAt: anchorTime - (i + 1) * 60 * 60 * 1000,
        visibility: "primary",
        severity: "error",
      });
    }

    const membership = await getWorkspaceMembership(ctx, workspace._id, workspace.userId);
    if (!membership) {
      throw new Error("Workspace owner membership not found");
    }
    const accessible = await getAccessibleProjectIds(ctx, workspace._id, membership);
    const drafts = await collectAllDraftRecommendations(
      ctx,
      workspace._id,
      accessible,
      project._id,
    );
    const createdIds = await insertDraftRecommendations(ctx, drafts, {
      type: "system",
      name: "test-seed",
    });

    const recommendationId = createdIds[0];
    if (!recommendationId) {
      throw new Error("No recommendations generated in seed story");
    }

    return {
      workspaceId: workspace.externalId,
      projectId: project._id,
      workstreamId: workstream._id,
      recommendationId,
      createdCount: createdIds.length,
    };
  },
});

export const seedEvalStory = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace first");
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.name === TEST_PROJECT_NAME) ?? null);
    if (!project) {
      throw new Error("Test project not found");
    }

    const workstream = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.title === "Impact Story Workstream") ?? null);
    if (!workstream) {
      throw new Error("Impact story workstream not found — run seedImpactStory first");
    }

    const recommendation = await ctx.db
      .query("recommendations")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .first();
    if (!recommendation) {
      throw new Error("Recommendation not found — run seedRecommendationStory first");
    }

    const playbook = await ctx.db
      .query("playbooks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then(
        (rows) =>
          rows.find((row) => row.title === "Stripe webhook validation playbook") ??
          rows[0] ??
          null,
      );
    if (!playbook) {
      throw new Error("Playbook not found — run seedLessonsPlaybooksStory first");
    }

    const lesson = await ctx.db
      .query("lessons")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .first();
    if (!lesson) {
      throw new Error("Lesson not found — run seedLessonsPlaybooksStory first");
    }

    const evalSuiteIds: Id<"evalSuites">[] = [];
    const createdBy = {
      clerkUserId: workspace.userId,
      source: "test-seed" as const,
      name: "test-seed",
    };

    for (const draft of [
      await loadRecommendationDraft(ctx, recommendation._id),
      await loadPlaybookDraft(ctx, playbook._id),
      await loadLessonDraft(ctx, lesson._id),
    ]) {
      const { suiteId, created } = await insertDraftEvalSuite(ctx, {
        ...draft,
        createdBy,
      });
      if (created) {
        evalSuiteIds.push(suiteId);
      } else if (!evalSuiteIds.includes(suiteId)) {
        evalSuiteIds.push(suiteId);
      }
    }

    if (evalSuiteIds.length === 0) {
      throw new Error("No eval suites created in seed story");
    }

    return {
      workspaceId: workspace.externalId,
      projectId: project._id,
      workstreamId: workstream._id,
      recommendationId: recommendation._id,
      playbookId: playbook._id,
      lessonId: lesson._id,
      evalSuiteIds,
    };
  },
});

export const seedEvalRemediationStory = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace first");
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.name === TEST_PROJECT_NAME) ?? null);
    if (!project) throw new Error("Test project not found");

    const workstream = await ctx.db
      .query("workstreams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect()
      .then((rows) => rows.find((row) => row.title === "Impact Story Workstream") ?? null);
    if (!workstream) throw new Error("Impact story workstream not found");

    const recommendation = await ctx.db
      .query("recommendations")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .first();
    if (!recommendation) throw new Error("Recommendation not found");

    const playbook = await ctx.db
      .query("playbooks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .first();
    if (!playbook) throw new Error("Playbook not found");

    const lesson = await ctx.db
      .query("lessons")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .first();
    if (!lesson) throw new Error("Lesson not found");

    const contextPack = await ctx.db
      .query("contextPacks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .first();

    const suiteId = await createEvalSuiteDoc(ctx, {
      workspaceId: workspace._id,
      projectId: project._id,
      workstreamId: workstream._id,
      recommendationId: recommendation._id,
      contextPackId: contextPack?._id,
      playbookId: playbook._id,
      lessonId: lesson._id,
      title: "Sprint 36 remediation failing eval suite",
      summary: "Intentionally failing command case for remediation loop testing.",
      source: "manual",
      status: "active",
      priority: "high",
      dedupKey: `remediation-fail:${workspace._id}`,
      tags: ["remediation", "sanity"],
    });

    const failingCaseId = await createEvalCaseDoc(ctx, {
      workspaceId: workspace._id,
      evalSuiteId: suiteId,
      title: "Intentional failing validation command",
      description: "Runs exit 1 to trigger remediation flow in sanity tests.",
      type: "command",
      required: true,
      config: { command: "exit 1" },
      expected: { exitCode: 0 },
      order: 0,
    });

    return {
      workspaceId: workspace.externalId,
      projectId: project._id,
      workstreamId: workstream._id,
      recommendationId: recommendation._id,
      contextPackId: contextPack?._id,
      playbookId: playbook._id,
      lessonId: lesson._id,
      evalSuiteId: suiteId,
      failingCaseId,
    };
  },
});

export const fixEvalRemediationCaseForRerun = mutation({
  args: { evalCaseId: v.id("evalCases") },
  handler: async (ctx, args) => {
    assertTestMode();
    const evalCase = await ctx.db.get(args.evalCaseId);
    if (!evalCase) throw new Error("Eval case not found");
    await ctx.db.patch(args.evalCaseId, {
      config: { command: "true" },
      expected: { exitCode: 0 },
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const seedLegacyGithubWebhookSecret = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace first");
    }

    await revokeActiveSecretsForWorkspace(ctx, workspace._id);

    const secretId = await createWebhookSecretDoc(ctx, {
      workspaceId: workspace._id,
      secret: TEST_GITHUB_WEBHOOK_SECRET,
      last4: TEST_GITHUB_WEBHOOK_SECRET.slice(-4),
    });

    return {
      workspaceId: workspace.externalId,
      webhookSecret: TEST_GITHUB_WEBHOOK_SECRET,
      secretId,
    };
  },
});

export const seedEncryptedGithubWebhookSecret = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestMode();
    const workspace = await findTestWorkspace(ctx);
    if (!workspace) {
      throw new Error("Test workspace not found — run seedTestWorkspace first");
    }

    await saveEncryptedIntegrationSecret(ctx, {
      workspaceId: workspace._id,
      source: "github",
      connectionName: "GitHub",
      secretName: "GitHub Webhook Secret",
      rawSecret: TEST_GITHUB_WEBHOOK_SECRET,
    });

    return {
      workspaceId: workspace.externalId,
      webhookSecret: TEST_GITHUB_WEBHOOK_SECRET,
    };
  },
});
