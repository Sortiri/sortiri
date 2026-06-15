import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/authz";
import { canManageAuditReports } from "./lib/authz";
import { requireWorkspaceMember } from "./lib/authz";
import {
  assertReportHasNoUnsafeExposedEvidence,
  assertReportSafeForShare,
  buildShareableReportPayload,
} from "./lib/auditExportLib";
import { getActiveReportAccess } from "./lib/auditReportAccessLib";
import {
  buildShareUrl,
  docToAuditShareLinkRecord,
  expiresInToMs,
  findShareLinkByHash,
  generateShareToken,
  getTokenLast4,
  hashShareToken,
  isShareTokenFormat,
  resolveShareLinkStatus,
} from "./lib/auditShareLib";
import { isIdInReportSnapshot, recordAuditReportEvent } from "./lib/auditReportsLib";
import { docToEvent } from "./lib/eventsLib";
import { isArtifactSafeForAudit } from "./lib/sensitiveContent";
import { SHARE_TOKEN_PREFIX } from "../src/types/audit-sharing";

const shareExpiryValidator = v.union(
  v.literal("24h"),
  v.literal("7d"),
  v.literal("30d"),
);

const exportFormatValidator = v.union(
  v.literal("markdown"),
  v.literal("html"),
  v.literal("json"),
);

async function requireReportOwnerOrAdmin(
  ctx: Parameters<typeof requireWorkspaceMember>[0],
  report: Doc<"auditReports">,
) {
  const workspace = await ctx.db.get(report.workspaceId);
  if (!workspace) {
    throw new Error("Report not found");
  }
  const { user, membership } = await requireWorkspaceMember(ctx, workspace.externalId);
  if (!canManageAuditReports(membership.role)) {
    throw new Error("Only workspace owners and admins can manage share links");
  }
  return { user, workspace, membership };
}

async function resolveValidShareLink(
  ctx: { db: Parameters<typeof findShareLinkByHash>[0]["db"] },
  token: string,
): Promise<
  | { ok: true; link: Doc<"auditShareLinks">; report: Doc<"auditReports">; workspace: Doc<"workspaces"> }
  | { ok: false }
> {
  if (!isShareTokenFormat(token)) {
    return { ok: false };
  }

  const tokenHash = await hashShareToken(token);
  const link = await findShareLinkByHash(ctx, tokenHash);
  if (!link) {
    return { ok: false };
  }

  const now = Date.now();
  const status = resolveShareLinkStatus(link, now);
  if (status !== "active") {
    return { ok: false };
  }

  const report = await ctx.db.get(link.reportId);
  if (!report || report.status !== "finalized") {
    return { ok: false };
  }

  const workspace = await ctx.db.get(link.workspaceId);
  if (!workspace) {
    return { ok: false };
  }

  return { ok: true, link, report, workspace };
}

export const createShareLink = mutation({
  args: {
    reportId: v.id("auditReports"),
    expiresIn: shareExpiryValidator,
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const { user, workspace } = await requireReportOwnerOrAdmin(ctx, report);
    if (report.workspaceId !== workspace._id) {
      throw new Error("Report not found");
    }

    assertReportSafeForShare(report);
    await assertReportHasNoUnsafeExposedEvidence(ctx, report._id);

    const rawToken = generateShareToken();
    const tokenHash = await hashShareToken(rawToken);
    const now = Date.now();
    const expiresAt = now + expiresInToMs(args.expiresIn);

    const shareLinkId = await ctx.db.insert("auditShareLinks", {
      workspaceId: workspace._id,
      reportId: report._id,
      tokenHash,
      tokenPrefix: SHARE_TOKEN_PREFIX,
      last4: getTokenLast4(rawToken),
      status: "active",
      expiresAt,
      createdBy: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
      accessCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await recordAuditReportEvent(ctx, {
      workspaceId: workspace._id,
      reportId: report._id,
      type: "audit_share_link.created",
      title: `Share link created for ${report.title}`,
      summary: `A secure share link was created (expires ${new Date(expiresAt).toISOString()}).`,
      actor: { type: "human", name: user.name ?? user.email ?? "User", email: user.email },
    });

    return {
      shareLinkId,
      shareUrl: buildShareUrl(rawToken),
      rawToken,
      expiresAt,
    };
  },
});

export const revokeShareLink = mutation({
  args: {
    shareLinkId: v.id("auditShareLinks"),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.shareLinkId);
    if (!link) {
      throw new Error("Share link not found");
    }
    const report = await ctx.db.get(link.reportId);
    if (!report) {
      throw new Error("Share link not found");
    }

    const { user, workspace } = await requireReportOwnerOrAdmin(ctx, report);
    if (link.workspaceId !== workspace._id) {
      throw new Error("Share link not found");
    }

    const now = Date.now();
    await ctx.db.patch(link._id, {
      status: "revoked",
      revokedAt: now,
      updatedAt: now,
    });

    await recordAuditReportEvent(ctx, {
      workspaceId: workspace._id,
      reportId: report._id,
      type: "audit_share_link.revoked",
      title: `Share link revoked for ${report.title}`,
      summary: "A secure share link was revoked.",
      actor: { type: "human", name: user.name ?? user.email ?? "User", email: user.email },
    });

    return { ok: true };
  },
});

export const listShareLinks = query({
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

    const { membership } = await requireWorkspaceMember(ctx, workspace.externalId);
    if (!canManageAuditReports(membership.role)) {
      throw new Error("Only workspace owners and admins can view share links");
    }

    const links = await ctx.db
      .query("auditShareLinks")
      .withIndex("by_report", (q) => q.eq("reportId", report._id))
      .collect();

    return links
      .map((link) => docToAuditShareLinkRecord(link, workspace.externalId))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const verifyShareToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveValidShareLink(ctx, args.token);
    if (!resolved.ok) {
      return { ok: false as const };
    }
    return {
      ok: true as const,
      reportId: resolved.report._id,
      workspaceId: resolved.workspace._id,
      shareLinkId: resolved.link._id,
    };
  },
});

export const markShareAccessed = mutation({
  args: {
    shareLinkId: v.id("auditShareLinks"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveValidShareLink(ctx, args.token);
    if (!resolved.ok || resolved.link._id !== args.shareLinkId) {
      return { ok: false };
    }

    const { link, report, workspace } = resolved;
    const now = Date.now();
    const previousCount = link.accessCount ?? 0;
    const shouldRecordTimeline =
      previousCount === 0 ||
      !link.lastAccessedAt ||
      now - link.lastAccessedAt >= 24 * 60 * 60 * 1000;

    await ctx.db.patch(link._id, {
      lastAccessedAt: now,
      accessCount: previousCount + 1,
      updatedAt: now,
    });

    if (shouldRecordTimeline) {
      await recordAuditReportEvent(ctx, {
        workspaceId: workspace._id,
        reportId: report._id,
        type: "audit_report.shared_viewed",
        title: `Shared report viewed: ${report.title}`,
        summary: "Someone viewed this audit report via a secure share link.",
        actor: { type: "system", name: "Share link" },
      });
    }

    return { ok: true };
  },
});

export const recordExport = mutation({
  args: {
    reportId: v.id("auditReports"),
    format: exportFormatValidator,
    status: v.union(v.literal("generated"), v.literal("failed")),
    sizeBytes: v.optional(v.number()),
    error: v.optional(v.string()),
    shareToken: v.optional(v.string()),
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

    let generatedBy: Doc<"auditExports">["generatedBy"] | undefined;

    if (args.shareToken) {
      const resolved = await resolveValidShareLink(ctx, args.shareToken);
      if (!resolved.ok || resolved.report._id !== report._id) {
        throw new Error("Invalid share token");
      }
      generatedBy = { name: "Share link export" };
    } else {
      const user = await getCurrentUser(ctx);
      const membership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_user", (q) =>
          q.eq("workspaceId", workspace._id).eq("clerkUserId", user.clerkUserId),
        )
        .unique();
      if (!membership) {
        throw new Error("Access denied");
      }

      const canExport =
        canManageAuditReports(membership.role) ||
        (await getActiveReportAccess(ctx, report._id, membership._id)) !== null;

      if (!canExport) {
        throw new Error("Access denied");
      }

      generatedBy = {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
      };
    }

    const now = Date.now();
    await ctx.db.insert("auditExports", {
      workspaceId: workspace._id,
      reportId: report._id,
      format: args.format,
      status: args.status,
      generatedBy,
      sizeBytes: args.sizeBytes,
      error: args.error,
      createdAt: now,
    });

    if (args.status === "generated") {
      await recordAuditReportEvent(ctx, {
        workspaceId: workspace._id,
        reportId: report._id,
        type: "audit_report.exported",
        title: `Audit report exported (${args.format})`,
        summary: `Report "${report.title}" was exported as ${args.format}.`,
        actor: generatedBy?.clerkUserId
          ? {
              type: "human",
              name: generatedBy.name ?? generatedBy.email ?? "User",
              email: generatedBy.email,
            }
          : { type: "system", name: "Share link" },
      });
    }

    return { ok: true };
  },
});

export const getShareableReport = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveValidShareLink(ctx, args.token);
    if (!resolved.ok) {
      return null;
    }

    return buildShareableReportPayload(
      ctx,
      resolved.report._id,
      resolved.workspace.externalId,
    );
  },
});

export const getShareableArtifact = query({
  args: {
    token: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveValidShareLink(ctx, args.token);
    if (!resolved.ok) {
      return null;
    }

    const { report } = resolved;
    if (!isIdInReportSnapshot(report, "artifact", args.artifactId)) {
      const item = await ctx.db
        .query("auditReportItems")
        .withIndex("by_report", (q) => q.eq("reportId", report._id))
        .collect();
      const included = item.some(
        (row) => row.artifactId && String(row.artifactId) === String(args.artifactId),
      );
      if (!included) {
        return null;
      }
    }

    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact || !isArtifactSafeForAudit(artifact)) {
      return null;
    }

    return {
      id: String(artifact._id),
      type: artifact.type,
      title: artifact.title,
      summary: artifact.summary,
      content: artifact.content,
      language: artifact.language,
      filePath: artifact.filePath,
      sensitivity: artifact.sensitivity,
      redactionStatus: artifact.redactionStatus,
      safeForAudit: artifact.safeForAudit,
      sensitiveFindings: artifact.sensitiveFindings,
      createdAt: artifact.createdAt,
    };
  },
});

export const listShareableWorkstreamEvents = query({
  args: {
    token: v.string(),
    workstreamId: v.id("workstreams"),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveValidShareLink(ctx, args.token);
    if (!resolved.ok) {
      return null;
    }

    const { report } = resolved;
    if (!isIdInReportSnapshot(report, "workstream", args.workstreamId)) {
      return null;
    }

    const snapshotEventIds = new Set((report.snapshotEventIds ?? []).map(String));
    const docs = await ctx.db
      .query("events")
      .withIndex("by_workstream", (q) => q.eq("workstreamId", args.workstreamId))
      .collect();

    return docs
      .filter((doc) => snapshotEventIds.has(String(doc._id)))
      .map(docToEvent)
      .filter((event) => event.safeForAudit !== false)
      .sort((a, b) => b.occurredAt - a.occurredAt);
  },
});

export const getExportPayloadForReport = query({
  args: {
    reportId: v.id("auditReports"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report || report.status !== "finalized") {
      return null;
    }
    const workspace = await ctx.db.get(report.workspaceId);
    if (!workspace) {
      return null;
    }

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspace._id).eq("clerkUserId", user.clerkUserId),
      )
      .unique();
    if (!membership) {
      return null;
    }

    const canExport =
      canManageAuditReports(membership.role) ||
      (await getActiveReportAccess(ctx, report._id, membership._id)) !== null;

    if (!canExport) {
      return null;
    }

    return buildShareableReportPayload(ctx, report._id, workspace.externalId);
  },
});

export const getExportPayloadForShareToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveValidShareLink(ctx, args.token);
    if (!resolved.ok) {
      return null;
    }
    return buildShareableReportPayload(
      ctx,
      resolved.report._id,
      resolved.workspace.externalId,
    );
  },
});
