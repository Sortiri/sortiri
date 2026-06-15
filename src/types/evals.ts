export type EvalSuiteSource =
  | "playbook"
  | "lesson"
  | "recommendation"
  | "context_pack"
  | "known_failure"
  | "manual"
  | "system";

export type EvalSuiteStatus = "draft" | "active" | "archived";

export type EvalSuitePriority = "low" | "normal" | "high" | "critical";

export type EvalCaseType =
  | "command"
  | "route_check"
  | "http_api_check"
  | "source_webhook_check"
  | "permission_check"
  | "evidence_safety_check"
  | "context_quality_check"
  | "playbook_step_check"
  | "no_secret_leak_check"
  | "manual_review";

export type EvalRunStatus =
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "needs_review"
  | "error";

export type EvalResultStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "needs_review"
  | "error";

export type EvalSuiteRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  recommendationId?: string;
  contextPackId?: string;
  playbookId?: string;
  lessonId?: string;
  title: string;
  summary: string;
  source: EvalSuiteSource;
  status: EvalSuiteStatus;
  priority: EvalSuitePriority;
  tags?: string[];
  dedupKey?: string;
  createdBy?: {
    clerkUserId?: string;
    email?: string;
    name?: string;
    source?: string;
  };
  createdAt: number;
  updatedAt: number;
};

export type EvalCaseRecord = {
  id: string;
  workspaceId: string;
  evalSuiteId: string;
  title: string;
  description?: string;
  type: EvalCaseType;
  required: boolean;
  config: Record<string, unknown>;
  expected?: Record<string, unknown>;
  order?: number;
  createdAt: number;
  updatedAt: number;
};

export type EvalRunRecord = {
  id: string;
  workspaceId: string;
  evalSuiteId: string;
  projectId?: string;
  workstreamId?: string;
  recommendationId?: string;
  contextPackId?: string;
  status: EvalRunStatus;
  summary?: string;
  startedAt?: number;
  completedAt?: number;
  createdBy?: EvalSuiteRecord["createdBy"];
  createdAt: number;
  updatedAt: number;
};

export type EvalResultRecord = {
  id: string;
  workspaceId: string;
  evalRunId: string;
  evalCaseId: string;
  status: EvalResultStatus;
  title: string;
  summary?: string;
  output?: string;
  error?: string;
  evidenceEventIds?: string[];
  evidenceArtifactIds?: string[];
  evidenceWorkstreamIds?: string[];
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
};

export type EvalSuiteFilters = {
  status?: EvalSuiteStatus | "all";
  source?: EvalSuiteSource | "all";
  projectId?: string;
};
