export type ContextPackStatus = "generated" | "failed" | "archived";

export type ContextPackItemType =
  | "event"
  | "workstream"
  | "entity"
  | "decision"
  | "impact_analysis"
  | "lesson"
  | "playbook"
  | "insight"
  | "artifact"
  | "validation_requirement"
  | "known_failure"
  | "note";

export type ContextPackRequest = {
  prompt?: string;
  files?: string[];
  entities?: string[];
  sources?: string[];
  categories?: string[];
  timeWindowMs?: number;
};

export type ContextPackCounts = {
  events: number;
  workstreams: number;
  entities: number;
  decisions: number;
  impacts: number;
  lessons: number;
  playbooks: number;
  insights: number;
  artifacts: number;
  failures: number;
  validationRequirements: number;
};

export type ContextPackRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  viewId?: string;
  entityId?: string;
  playbookId?: string;
  lessonId?: string;
  impactAnalysisId?: string;
  title: string;
  goal: string;
  status: ContextPackStatus;
  requestedBy?: {
    type?: string;
    clerkUserId?: string;
    email?: string;
    name?: string;
    source?: string;
  };
  request: ContextPackRequest;
  summary?: string;
  counts?: ContextPackCounts;
  createdAt: number;
  updatedAt: number;
};

export type ContextPackItemRecord = {
  id: string;
  workspaceId: string;
  contextPackId: string;
  itemType: ContextPackItemType;
  eventId?: string;
  workstreamId?: string;
  entityId?: string;
  impactAnalysisId?: string;
  lessonId?: string;
  playbookId?: string;
  insightFindingId?: string;
  artifactId?: string;
  title: string;
  summary?: string;
  reason?: string;
  importance?: "low" | "normal" | "high" | "critical";
  confidence?: "possible" | "likely" | "strong";
  order?: number;
  createdAt: number;
};

export type ContextPackFormatted = {
  text: string;
  pack: ContextPackRecord;
  items: ContextPackItemRecord[];
};
