export type LessonType =
  | "positive_pattern"
  | "negative_pattern"
  | "risk"
  | "validation"
  | "product_learning"
  | "revenue_learning"
  | "engineering_learning"
  | "process_learning"
  | "security_learning"
  | "other";

export type LessonStatus = "draft" | "active" | "archived";

export type LessonConfidence = "possible" | "likely" | "strong";

export type LessonImportance = "low" | "normal" | "high" | "critical";

export type LessonSource =
  | "impact_analysis"
  | "insight"
  | "manual"
  | "failure_pattern"
  | "decision"
  | "system";

export type LessonRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  viewId?: string;
  workstreamId?: string;
  entityId?: string;
  impactAnalysisId?: string;
  title: string;
  summary: string;
  type: LessonType;
  status: LessonStatus;
  confidence: LessonConfidence;
  importance: LessonImportance;
  source: LessonSource;
  recommendation?: string;
  evidenceEventIds?: string[];
  evidenceWorkstreamIds?: string[];
  evidenceEntityIds?: string[];
  evidenceImpactAnalysisIds?: string[];
  evidenceInsightFindingIds?: string[];
  evidenceArtifactIds?: string[];
  tags?: string[];
  createdBy?: {
    clerkUserId?: string;
    email?: string;
    name?: string;
  };
  createdAt: number;
  updatedAt: number;
};

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  positive_pattern: "Positive",
  negative_pattern: "Negative",
  risk: "Risk",
  validation: "Validation",
  product_learning: "Product",
  revenue_learning: "Revenue",
  engineering_learning: "Engineering",
  process_learning: "Process",
  security_learning: "Security",
  other: "Other",
};
