export type ImpactAnalysisStatus = "draft" | "generated" | "failed" | "archived";

export type ImpactAnchorType =
  | "event"
  | "workstream"
  | "project"
  | "view"
  | "entity"
  | "manual";

export type ImpactWindowPreset = "24h" | "7d" | "30d";

export type ImpactAnchor = {
  type: ImpactAnchorType;
  eventId?: string;
  workstreamId?: string;
  projectId?: string;
  viewId?: string;
  entityId?: string;
  title: string;
  occurredAt: number;
};

export type ImpactWindow = {
  beforeMs: number;
  afterMs: number;
  baselineStart: number;
  baselineEnd: number;
  impactStart: number;
  impactEnd: number;
};

export type ImpactAnalysisRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  viewId?: string;
  title: string;
  summary?: string;
  status: ImpactAnalysisStatus;
  anchor: ImpactAnchor;
  window: ImpactWindow;
  filters?: {
    categories?: string[];
    sources?: string[];
    entityTypes?: string[];
    projectIds?: string[];
    visibility?: "primary" | "all";
  };
  metrics?: {
    baseline: unknown;
    impact: unknown;
    delta: unknown;
  };
  generatedSummary?: string;
  createdBy?: {
    clerkUserId?: string;
    email?: string;
    name?: string;
  };
  generatedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type ImpactFindingType =
  | "product_movement"
  | "revenue_movement"
  | "activation_movement"
  | "feature_usage"
  | "customer_activity"
  | "payment_activity"
  | "negative_signal"
  | "related_work"
  | "risk"
  | "other";

export type ImpactFindingRecord = {
  id: string;
  workspaceId: string;
  analysisId: string;
  type: ImpactFindingType;
  severity: "info" | "warning" | "critical";
  confidence: "possible" | "likely" | "strong";
  title: string;
  summary: string;
  evidenceEventIds?: string[];
  evidenceWorkstreamIds?: string[];
  evidenceEntityIds?: string[];
  evidenceArtifactIds?: string[];
  metrics?: unknown;
  createdAt: number;
};
