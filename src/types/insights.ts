import type { TimelineEvent } from "@/types/events";

export type InsightWindow = "24h" | "7d" | "30d";

export type InsightRunStatus = "pending" | "completed" | "failed";

export type InsightFindingType =
  | "hotspot"
  | "risk"
  | "sensitive_evidence"
  | "duplicate_work"
  | "error"
  | "stale_workstream"
  | "product_movement"
  | "decision"
  | "summary"
  | "impact_opportunity"
  | "lesson_opportunity"
  | "other";

export type InsightFindingSeverity = "info" | "warning" | "critical";

export type InsightCountItem = {
  source?: string;
  category?: string;
  count: number;
};

export type InsightOverview = {
  totalEvents: number;
  agentActions: number;
  codeChanges: number;
  productEvents: number;
  decisions: number;
  revenueEvents: number;
  systemEvents: number;
  activeWorkstreams: number;
  completedWorkstreams: number;
  topSources: InsightCountItem[];
  topCategories: InsightCountItem[];
  recentErrors: TimelineEvent[];
  recentDecisions: TimelineEvent[];
  recentProductEvents: TimelineEvent[];
};

export type InsightRun = {
  id: string;
  workspaceId: string;
  title: string;
  summary?: string;
  status: InsightRunStatus;
  windowStart: number;
  windowEnd: number;
  generatedBy?: {
    type: "agent" | "human" | "system";
    id?: string;
    name?: string;
  };
  eventCount?: number;
  workstreamCount?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

export type InsightEvidenceEvent = {
  id: string;
  title: string;
  workstreamId?: string;
  artifactIds?: string[];
  artifactCount?: number;
  primaryArtifactId?: string;
  primaryArtifactTitle?: string;
};

export type InsightEvidenceWorkstream = {
  id: string;
  title: string;
};

export type InsightFinding = {
  id: string;
  workspaceId: string;
  runId: string;
  type: InsightFindingType;
  severity: InsightFindingSeverity;
  title: string;
  summary: string;
  recommendation?: string;
  evidenceEventIds?: string[];
  evidenceWorkstreamIds?: string[];
  data?: unknown;
  createdAt: number;
};

export type InsightFindingDetail = InsightFinding & {
  evidence: {
    events: InsightEvidenceEvent[];
    workstreams: InsightEvidenceWorkstream[];
    relatedEvents: InsightEvidenceEvent[];
  };
};
