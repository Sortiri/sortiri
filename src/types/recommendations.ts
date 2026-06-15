export type RecommendationType =
  | "investigate"
  | "fix"
  | "improve"
  | "validate"
  | "review"
  | "monitor"
  | "create_playbook"
  | "create_lesson"
  | "security_review"
  | "audit_review"
  | "other";

export type RecommendationSource =
  | "insight"
  | "impact_analysis"
  | "lesson"
  | "playbook"
  | "known_failure"
  | "source_health"
  | "posthog"
  | "stripe"
  | "github"
  | "system"
  | "manual";

export type RecommendationStatus =
  | "open"
  | "accepted"
  | "dismissed"
  | "converted_to_workstream"
  | "archived";

export type RecommendationPriority = "low" | "normal" | "high" | "critical";

export type RecommendationConfidence = "possible" | "likely" | "strong";

export type RecommendationValidationRequirement = {
  title: string;
  command?: string;
  reason?: string;
  required?: boolean;
};

export type RecommendationRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  entityId?: string;
  viewId?: string;
  title: string;
  summary: string;
  type: RecommendationType;
  source: RecommendationSource;
  status: RecommendationStatus;
  priority: RecommendationPriority;
  confidence: RecommendationConfidence;
  reason?: string;
  suggestedGoal?: string;
  suggestedWorkstreamTitle?: string;
  recommendedPlaybookId?: string;
  generatedContextPackId?: string;
  convertedWorkstreamId?: string;
  validationRequirements?: RecommendationValidationRequirement[];
  evidenceEventIds?: string[];
  evidenceWorkstreamIds?: string[];
  evidenceEntityIds?: string[];
  evidenceImpactAnalysisIds?: string[];
  evidenceLessonIds?: string[];
  evidencePlaybookIds?: string[];
  evidenceInsightFindingIds?: string[];
  evidenceArtifactIds?: string[];
  dismissedReason?: string;
  dedupKey?: string;
  createdBy?: {
    type?: string;
    clerkUserId?: string;
    email?: string;
    name?: string;
  };
  createdAt: number;
  updatedAt: number;
};

export type RecommendationQueueFilters = {
  status?: RecommendationStatus | "all";
  priority?: RecommendationPriority | "all";
  source?: RecommendationSource | "all";
  projectId?: string;
};

export type RecommendationEvidenceCounts = {
  events: number;
  workstreams: number;
  entities: number;
  impacts: number;
  lessons: number;
  playbooks: number;
  insights: number;
  artifacts: number;
};

export type RecommendationDetailSections = {
  summary: string;
  reason?: string;
  evidenceCounts: RecommendationEvidenceCounts;
  suggestedWorkstreamTitle?: string;
  suggestedGoal?: string;
  recommendedPlaybookId?: string;
  validationRequirements?: RecommendationValidationRequirement[];
  generatedContextPackId?: string;
  convertedWorkstreamId?: string;
};
