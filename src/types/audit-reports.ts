import type { WorkspaceRole } from "./workspace-members";
import type { EvidenceSafetySummary } from "./evidence-safety";

export type AuditReportStatus = "draft" | "finalized" | "archived";

export type AuditReportItemType =
  | "event"
  | "workstream"
  | "artifact"
  | "entity"
  | "insight"
  | "impact_analysis"
  | "lesson"
  | "playbook"
  | "note";

export type AuditReportAccessLevel = "viewer" | "reviewer";

export type AuditReportScope = {
  projectIds?: string[];
  viewId?: string;
  entityIds?: string[];
  impactAnalysisId?: string;
  lessonIds?: string[];
  playbookIds?: string[];
  windowStart?: number;
  windowEnd?: number;
  categories?: string[];
  sources?: string[];
  visibility?: "primary" | "all";
};

export type AuditReportRecord = {
  id: string;
  workspaceId: string;
  title: string;
  summary?: string;
  status: AuditReportStatus;
  scope: AuditReportScope;
  snapshotEventIds?: string[];
  snapshotWorkstreamIds?: string[];
  snapshotArtifactIds?: string[];
  snapshotEntityIds?: string[];
  generatedSummary?: string;
  createdBy?: {
    clerkUserId?: string;
    email?: string;
    name?: string;
  };
  finalizedAt?: number;
  createdAt: number;
  updatedAt: number;
  itemCount?: number;
  safetySummary?: EvidenceSafetySummary;
};

export type AuditReportItemRecord = {
  id: string;
  workspaceId: string;
  reportId: string;
  itemType: AuditReportItemType;
  eventId?: string;
  workstreamId?: string;
  artifactId?: string;
  entityId?: string;
  insightFindingId?: string;
  impactAnalysisId?: string;
  lessonId?: string;
  playbookId?: string;
  title: string;
  summary?: string;
  reason?: string;
  order?: number;
  createdAt: number;
};

export type AuditReportAccessRecord = {
  id: string;
  workspaceId: string;
  reportId: string;
  memberId: string;
  accessLevel: AuditReportAccessLevel;
  status: "active" | "revoked";
  grantedBy?: {
    clerkUserId?: string;
    email?: string;
    name?: string;
  };
  createdAt: number;
  updatedAt: number;
  revokedAt?: number;
  memberName?: string;
  memberEmail?: string;
};

export function canManageAuditReports(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function isReportImmutable(status: AuditReportStatus): boolean {
  return status === "finalized" || status === "archived";
}

export function canAccessWorkspaceNav(role: WorkspaceRole): boolean {
  return role !== "auditor";
}
