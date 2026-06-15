import type { AuditReportItemRecord, AuditReportScope } from "./audit-reports";
import type { EvidenceSafetySummary } from "./evidence-safety";
import type { Artifact } from "./events";

export type ShareLinkExpiry = "24h" | "7d" | "30d";

export type AuditShareLinkStatus = "active" | "revoked" | "expired";

export type AuditExportFormat = "markdown" | "html" | "json";

export type AuditExportStatus = "generated" | "failed";

export type AuditShareLinkRecord = {
  id: string;
  workspaceId: string;
  reportId: string;
  maskedToken: string;
  status: AuditShareLinkStatus;
  expiresAt: number;
  lastAccessedAt?: number;
  accessCount: number;
  createdBy?: {
    clerkUserId?: string;
    email?: string;
    name?: string;
  };
  createdAt: number;
  updatedAt: number;
  revokedAt?: number;
};

export type ShareableArtifactExport = Pick<
  Artifact,
  | "id"
  | "type"
  | "title"
  | "summary"
  | "content"
  | "language"
  | "filePath"
  | "sensitivity"
  | "redactionStatus"
  | "safeForAudit"
  | "sensitiveFindings"
  | "createdAt"
>;

export type ShareableEventExport = {
  id: string;
  title: string;
  summary?: string;
  type: string;
  category: string;
  source: string;
  occurredAt: number;
  sensitivity?: Artifact["sensitivity"];
  redactionStatus?: Artifact["redactionStatus"];
  safeForAudit?: boolean;
};

export type ShareableWorkstreamExport = {
  id: string;
  title: string;
  summary?: string;
  status: string;
  createdAt: number;
};

export type ShareableEntityExport = {
  id: string;
  type: string;
  key: string;
  name?: string;
  summary?: string;
};

export type ShareableInsightExport = {
  id: string;
  title: string;
  summary?: string;
  severity: string;
  findingType: string;
};

export type ShareableReportSafety = {
  excludedSensitiveEvidenceCount: number;
  redactedEvidenceCount: number;
  blockedEvidenceCount: number;
  runtimeExcludedCount: number;
};

export type ShareableReportExportInput = {
  report: {
    id: string;
    title: string;
    status: string;
    finalizedAt?: number;
    generatedSummary?: string;
    scope: AuditReportScope;
    safetySummary?: EvidenceSafetySummary;
  };
  items: AuditReportItemRecord[];
  evidence: {
    events: ShareableEventExport[];
    workstreams: ShareableWorkstreamExport[];
    artifacts: ShareableArtifactExport[];
    entities: ShareableEntityExport[];
    insights: ShareableInsightExport[];
  };
  safety: ShareableReportSafety;
  exportedAt?: number;
};

export type AuditEvidenceManifest = {
  report: {
    id: string;
    title: string;
    status: string;
    finalizedAt?: number;
    generatedSummary?: string;
    scope: AuditReportScope;
  };
  evidence: {
    events: ShareableEventExport[];
    workstreams: ShareableWorkstreamExport[];
    artifacts: ShareableArtifactExport[];
    entities: ShareableEntityExport[];
    insights: ShareableInsightExport[];
  };
  safety: {
    excludedSensitiveEvidenceCount: number;
    redactedEvidenceCount: number;
    blockedEvidenceCount: number;
  };
  exportedAt: number;
};

export const SHARE_TOKEN_PREFIX = "share_sortiri_";

export const SHARE_LINK_EXPIRY_OPTIONS: Array<{
  value: ShareLinkExpiry;
  label: string;
}> = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export const EXPORT_SAFETY_NOTICE =
  "Some sensitive evidence may have been excluded from this report according to workspace safety policy.";
