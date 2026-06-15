import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { WorkspaceRole } from "../../src/types/workspace-members";
import type {
  AuditReportAccessLevel,
  AuditReportAccessRecord,
} from "../../src/types/audit-reports";
import { canManageAuditReports } from "../../src/types/audit-reports";
import { isArtifactSafeForAudit } from "./sensitiveContent";

type DbReadCtx = Pick<QueryCtx, "db">;
type DbWriteCtx = Pick<MutationCtx, "db">;

export async function getActiveReportAccess(
  ctx: DbReadCtx,
  reportId: Id<"auditReports">,
  memberId: Id<"workspaceMembers">,
): Promise<Doc<"auditReportAccess"> | null> {
  const row = await ctx.db
    .query("auditReportAccess")
    .withIndex("by_report_member", (q) =>
      q.eq("reportId", reportId).eq("memberId", memberId),
    )
    .unique();
  if (!row || row.status !== "active") {
    return null;
  }
  return row;
}

export function canViewAuditReport(
  role: WorkspaceRole,
  accessRow: Doc<"auditReportAccess"> | null,
): boolean {
  if (canManageAuditReports(role)) {
    return true;
  }
  return accessRow !== null && accessRow.status === "active";
}

export async function listAccessibleReportIds(
  ctx: DbReadCtx,
  workspaceId: Id<"workspaces">,
  memberId: Id<"workspaceMembers">,
  role: WorkspaceRole,
): Promise<Set<Id<"auditReports">> | "all"> {
  if (canManageAuditReports(role)) {
    return "all";
  }

  const rows = await ctx.db
    .query("auditReportAccess")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .collect();

  const ids = new Set<Id<"auditReports">>();
  for (const row of rows) {
    if (row.status === "active" && row.workspaceId === workspaceId) {
      ids.add(row.reportId);
    }
  }
  return ids;
}

export async function upsertReportAccess(
  ctx: DbWriteCtx,
  input: {
    workspaceId: Id<"workspaces">;
    reportId: Id<"auditReports">;
    memberId: Id<"workspaceMembers">;
    accessLevel: AuditReportAccessLevel;
    grantedBy?: Doc<"auditReportAccess">["grantedBy"];
  },
): Promise<Id<"auditReportAccess">> {
  const now = Date.now();
  const existing = await ctx.db
    .query("auditReportAccess")
    .withIndex("by_report_member", (q) =>
      q.eq("reportId", input.reportId).eq("memberId", input.memberId),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      accessLevel: input.accessLevel,
      status: "active",
      grantedBy: input.grantedBy,
      updatedAt: now,
      revokedAt: undefined,
    });
    return existing._id;
  }

  return ctx.db.insert("auditReportAccess", {
    workspaceId: input.workspaceId,
    reportId: input.reportId,
    memberId: input.memberId,
    accessLevel: input.accessLevel,
    status: "active",
    grantedBy: input.grantedBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function revokeReportAccess(
  ctx: DbWriteCtx,
  reportId: Id<"auditReports">,
  memberId: Id<"workspaceMembers">,
): Promise<void> {
  const existing = await ctx.db
    .query("auditReportAccess")
    .withIndex("by_report_member", (q) =>
      q.eq("reportId", reportId).eq("memberId", memberId),
    )
    .unique();
  if (!existing || existing.status !== "active") {
    return;
  }
  const now = Date.now();
  await ctx.db.patch(existing._id, {
    status: "revoked",
    updatedAt: now,
    revokedAt: now,
  });
}

export function docToAuditReportAccess(
  doc: Doc<"auditReportAccess">,
  workspaceExternalId: string,
): AuditReportAccessRecord {
  return {
    id: doc._id,
    workspaceId: workspaceExternalId,
    reportId: doc.reportId,
    memberId: doc.memberId,
    accessLevel: doc.accessLevel,
    status: doc.status,
    grantedBy: doc.grantedBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    revokedAt: doc.revokedAt,
  };
}

export async function isArtifactInAccessibleReport(
  ctx: DbReadCtx,
  artifactId: Id<"artifacts">,
  memberId: Id<"workspaceMembers">,
): Promise<boolean> {
  const accessRows = await ctx.db
    .query("auditReportAccess")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .collect();

  for (const row of accessRows) {
    if (row.status !== "active") continue;
    const report = await ctx.db.get(row.reportId);
    if (!report) continue;
    const snapshot = report.snapshotArtifactIds ?? [];
    if (snapshot.includes(artifactId)) {
      const artifact = await ctx.db.get(artifactId);
      if (artifact && isArtifactSafeForAudit(artifact)) {
        return true;
      }
    }
  }
  return false;
}

export async function assertReportViewAccess(
  ctx: DbReadCtx,
  report: Doc<"auditReports">,
  membership: Doc<"workspaceMembers">,
): Promise<void> {
  const accessRow = await getActiveReportAccess(ctx, report._id, membership._id);
  if (!canViewAuditReport(membership.role, accessRow)) {
    throw new Error("Report not found");
  }
}
