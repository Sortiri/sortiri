import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  canManageAuditReports,
  getCurrentUser,
  getMembershipAndAccessible,
  requireWorkspaceMember,
  requireWorkspaceRole,
} from "./lib/authz";
import {
  assertReportViewAccess,
  docToAuditReportAccess,
  getActiveReportAccess,
  listAccessibleReportIds,
  revokeReportAccess,
  upsertReportAccess,
} from "./lib/auditReportAccessLib";
import {
  assertReportMutable,
  collectEvidenceFromScope,
  docToAuditReport,
  docToAuditReportItem,
  recordAuditReportEvent,
  replaceReportItems,
  isIdInReportSnapshot,
} from "./lib/auditReportsLib";
import { docToEvent } from "./lib/eventsLib";
import { auditReportAccessLevelValidator, auditReportScopeValidator } from "./lib/validators";

export const create = mutation({
  args: {
    workspaceId: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    scope: auditReportScopeValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const now = Date.now();
    const reportId = await ctx.db.insert("auditReports", {
      workspaceId: workspace._id,
      title: args.title.trim() || "Untitled audit report",
      summary: args.summary?.trim(),
      status: "draft",
      scope: args.scope,
      createdBy: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
      createdAt: now,
      updatedAt: now,
    });

    await recordAuditReportEvent(ctx, {
      workspaceId: workspace._id,
      reportId,
      type: "audit_report.created",
      title: `Audit report created: ${args.title.trim()}`,
      summary: args.summary?.trim() ?? "Draft audit report created.",
      actor: { type: "human", name: user.name ?? user.email ?? "User", email: user.email },
    });

    return { reportId, workspaceId: workspace.externalId };
  },
});

export const generateEvidence = mutation({
  args: {
    reportId: v.id("auditReports"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const workspace = await ctx.db.get(report.workspaceId);
    if (!workspace) {
      throw new Error("Report not found");
    }

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);
    assertReportMutable(report);

    const { accessible } = await getMembershipAndAccessible(
      ctx,
      workspace._id,
      user.clerkUserId,
    );

    const evidence = await collectEvidenceFromScope(
      ctx,
      workspace._id,
      report.scope,
      accessible,
      user.clerkUserId,
    );

    await replaceReportItems(ctx, report._id, workspace._id, evidence.items);

    const now = Date.now();
    await ctx.db.patch(report._id, {
      snapshotEventIds: evidence.eventIds,
      snapshotWorkstreamIds: evidence.workstreamIds,
      snapshotArtifactIds: evidence.artifactIds,
      snapshotEntityIds: evidence.entityIds,
      generatedSummary: evidence.generatedSummary,
      safetySummary: evidence.safetySummary,
      updatedAt: now,
    });

    await recordAuditReportEvent(ctx, {
      workspaceId: workspace._id,
      reportId: report._id,
      type: "audit_report.evidence_generated",
      title: `Evidence generated for ${report.title}`,
      summary: `${evidence.items.length} evidence items included in the report.`,
      actor: { type: "human", name: user.name ?? user.email ?? "User", email: user.email },
    });

    return {
      itemCount: evidence.items.length,
      generatedSummary: evidence.generatedSummary,
      safetySummary: evidence.safetySummary,
    };
  },
});

export const finalize = mutation({
  args: {
    reportId: v.id("auditReports"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }
    const workspace = await ctx.db.get(report.workspaceId);
    if (!workspace) {
      throw new Error("Report not found");
    }

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);
    assertReportMutable(report);

    const now = Date.now();
    await ctx.db.patch(report._id, {
      status: "finalized",
      finalizedAt: now,
      updatedAt: now,
    });

    await recordAuditReportEvent(ctx, {
      workspaceId: workspace._id,
      reportId: report._id,
      type: "audit_report.finalized",
      title: `Audit report finalized: ${report.title}`,
      summary: "Report snapshot is now read-only.",
      actor: { type: "human", name: user.name ?? user.email ?? "User", email: user.email },
    });

    return { ok: true };
  },
});

export const deleteDraft = mutation({
  args: {
    reportId: v.id("auditReports"),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }
    const workspace = await ctx.db.get(report.workspaceId);
    if (!workspace) {
      throw new Error("Report not found");
    }

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);
    if (report.status !== "draft") {
      throw new Error("Only draft reports can be deleted");
    }

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
    return { ok: true };
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const { workspace, membership } = await requireWorkspaceMember(ctx, args.workspaceId);

    const accessibleIds = await listAccessibleReportIds(
      ctx,
      workspace._id,
      membership._id,
      membership.role,
    );

    let docs = await ctx.db
      .query("auditReports")
      .withIndex("by_workspace_created_at", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .collect();

    if (accessibleIds !== "all") {
      docs = docs.filter((doc) => accessibleIds.has(doc._id));
    }

    const results = [];
    for (const doc of docs) {
      const itemCount = await ctx.db
        .query("auditReportItems")
        .withIndex("by_report", (q) => q.eq("reportId", doc._id))
        .collect()
        .then((rows) => rows.length);
      results.push(docToAuditReport(doc, workspace.externalId, itemCount));
    }
    return results;
  },
});

export const getById = query({
  args: {
    reportId: v.id("auditReports"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }
    const workspace = await ctx.db.get(report.workspaceId);
    if (!workspace) {
      throw new Error("Report not found");
    }

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspace._id).eq("clerkUserId", userId),
      )
      .unique();
    if (!membership) {
      throw new Error("Report not found");
    }

    await assertReportViewAccess(ctx, report, membership);

    const itemCount = await ctx.db
      .query("auditReportItems")
      .withIndex("by_report", (q) => q.eq("reportId", report._id))
      .collect()
      .then((rows) => rows.length);

    return docToAuditReport(report, workspace.externalId, itemCount);
  },
});

export const listItems = query({
  args: {
    reportId: v.id("auditReports"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }
    const workspace = await ctx.db.get(report.workspaceId);
    if (!workspace) {
      throw new Error("Report not found");
    }

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspace._id).eq("clerkUserId", userId),
      )
      .unique();
    if (!membership) {
      throw new Error("Report not found");
    }

    await assertReportViewAccess(ctx, report, membership);

    const items = await ctx.db
      .query("auditReportItems")
      .withIndex("by_report", (q) => q.eq("reportId", report._id))
      .collect();

    items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return items.map((item) => docToAuditReportItem(item, workspace.externalId));
  },
});

export const grantAccess = mutation({
  args: {
    workspaceId: v.string(),
    reportId: v.id("auditReports"),
    memberId: v.id("workspaceMembers"),
    accessLevel: auditReportAccessLevelValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const report = await ctx.db.get(args.reportId);
    if (!report || report.workspaceId !== workspace._id) {
      throw new Error("Report not found");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member || member.workspaceId !== workspace._id) {
      throw new Error("Member not found");
    }

    await upsertReportAccess(ctx, {
      workspaceId: workspace._id,
      reportId: report._id,
      memberId: member._id,
      accessLevel: args.accessLevel,
      grantedBy: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });

    await recordAuditReportEvent(ctx, {
      workspaceId: workspace._id,
      reportId: report._id,
      type: "audit_report.access_granted",
      title: `Access granted to ${member.name ?? member.email ?? "member"}`,
      summary: `${member.email ?? "Member"} can view audit report "${report.title}".`,
      actor: { type: "human", name: user.name ?? user.email ?? "User", email: user.email },
    });

    return { ok: true };
  },
});

export const revokeAccess = mutation({
  args: {
    workspaceId: v.string(),
    reportId: v.id("auditReports"),
    memberId: v.id("workspaceMembers"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
    ]);

    const report = await ctx.db.get(args.reportId);
    if (!report || report.workspaceId !== workspace._id) {
      throw new Error("Report not found");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    await revokeReportAccess(ctx, report._id, member._id);

    await recordAuditReportEvent(ctx, {
      workspaceId: workspace._id,
      reportId: report._id,
      type: "audit_report.access_revoked",
      title: `Access revoked for ${member.name ?? member.email ?? "member"}`,
      summary: `Removed access to audit report "${report.title}".`,
      actor: { type: "human", name: user.name ?? user.email ?? "User", email: user.email },
    });

    return { ok: true };
  },
});

export const listAccess = query({
  args: {
    workspaceId: v.string(),
    reportId: v.id("auditReports"),
  },
  handler: async (ctx, args) => {
    const { workspace, membership } = await requireWorkspaceMember(ctx, args.workspaceId);
    const report = await ctx.db.get(args.reportId);
    if (!report || report.workspaceId !== workspace._id) {
      throw new Error("Report not found");
    }

    if (!canManageAuditReports(membership.role)) {
      await assertReportViewAccess(ctx, report, membership);
    }

    const rows = await ctx.db
      .query("auditReportAccess")
      .withIndex("by_report", (q) => q.eq("reportId", report._id))
      .collect();

    const results = [];
    for (const row of rows) {
      const member = await ctx.db.get(row.memberId);
      const record = docToAuditReportAccess(row, workspace.externalId);
      results.push({
        ...record,
        memberName: member?.name,
        memberEmail: member?.email,
        memberRole: member?.role,
      });
    }
    return results;
  },
});

export const recordAuditorView = mutation({
  args: {
    reportId: v.id("auditReports"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      return { ok: false };
    }
    const workspace = await ctx.db.get(report.workspaceId);
    if (!workspace) {
      return { ok: false };
    }

    const membership = await requireWorkspaceMember(ctx, workspace.externalId);
    await assertReportViewAccess(ctx, report, membership.membership);

    await recordAuditReportEvent(ctx, {
      workspaceId: workspace._id,
      reportId: report._id,
      type: "audit_report.viewed_by_auditor",
      title: `Auditor viewed report: ${report.title}`,
      summary: `${user.email ?? user.name ?? "Auditor"} opened the audit report.`,
      actor: { type: "human", name: user.name ?? "Auditor", email: user.email },
    });

    return { ok: true };
  },
});

export const canAccessReport = query({
  args: {
    reportId: v.id("auditReports"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      return { canAccess: false };
    }
    const workspace = await ctx.db.get(report.workspaceId);
    if (!workspace) {
      return { canAccess: false };
    }
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspace._id).eq("clerkUserId", userId),
      )
      .unique();
    if (!membership) {
      return { canAccess: false };
    }
    const accessRow = await getActiveReportAccess(ctx, report._id, membership._id);
    return {
      canAccess: canManageAuditReports(membership.role) || accessRow !== null,
      workspaceId: workspace.externalId,
    };
  },
});

export const listWorkstreamEventsForReport = query({
  args: {
    reportId: v.id("auditReports"),
    workstreamId: v.id("workstreams"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }
    const workspace = await ctx.db.get(report.workspaceId);
    if (!workspace) {
      throw new Error("Report not found");
    }

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspace._id).eq("clerkUserId", userId),
      )
      .unique();
    if (!membership) {
      throw new Error("Report not found");
    }

    await assertReportViewAccess(ctx, report, membership);

    if (!isIdInReportSnapshot(report, "workstream", args.workstreamId)) {
      throw new Error("Workstream not found");
    }

    const snapshotEventIds = new Set((report.snapshotEventIds ?? []).map(String));
    const docs = await ctx.db
      .query("events")
      .withIndex("by_workstream", (q) => q.eq("workstreamId", args.workstreamId))
      .collect();

    return docs
      .filter((doc) => snapshotEventIds.has(String(doc._id)))
      .map(docToEvent)
      .sort((a, b) => b.occurredAt - a.occurredAt);
  },
});
