import type {
  EvidenceReviewer,
  RedactionStatus,
  SensitiveFinding,
  SensitivityLevel,
} from "./evidence-safety";

export type EventSource =
  | "cursor"
  | "claude_code"
  | "codex"
  | "sdk"
  | "github"
  | "stripe"
  | "posthog"
  | "slack"
  | "linear"
  | "manual"
  | "system"
  | "watcher"
  | "cli"
  | "other";

export type EventCategory =
  | "agent_action"
  | "code_change"
  | "product_event"
  | "company_decision"
  | "revenue_event"
  | "system_event";

export type ActorType = "agent" | "human" | "system" | "customer";

export type ArtifactType =
  | "diff"
  | "file"
  | "url"
  | "screenshot"
  | "document"
  | "log"
  | "command_output"
  | "other";

export type EventSeverity = "info" | "warning" | "error" | "critical";

export type EventImportance = "low" | "normal" | "high" | "critical";

export type EventVisibility = "primary" | "debug" | "hidden";

export type SourceStatus = "connected" | "disconnected" | "error";

export type WorkstreamStatus = "active" | "completed" | "archived";

export type EntityType =
  | "file"
  | "user"
  | "customer"
  | "feature"
  | "project"
  | "workspace"
  | "pull_request"
  | "issue"
  | "payment"
  | "subscription"
  | "command"
  | "source"
  | "actor"
  | "other";

export type EventActor = {
  type: ActorType;
  id?: string;
  name?: string;
  email?: string;
};

export type EventEntity = {
  type: EntityType;
  id?: string;
  name?: string;
  url?: string;
};

export type TimelineEvent = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  sourceId?: string;
  source: EventSource;
  category: EventCategory;
  type: string;
  actor: EventActor;
  title: string;
  summary?: string;
  entity?: EventEntity;
  artifactIds?: string[];
  data?: unknown;
  severity?: EventSeverity;
  tags?: string[];
  importance?: EventImportance;
  visibility?: EventVisibility;
  displayReason?: string;
  isUserPinned?: boolean;
  isUserHidden?: boolean;
  sensitivity?: SensitivityLevel;
  redactionStatus?: RedactionStatus;
  safeForAudit?: boolean;
  sensitiveFindings?: SensitiveFinding[];
  reviewedBy?: EvidenceReviewer;
  reviewedAt?: number;
  occurredAt: number;
  createdAt: number;
};

export type Workstream = {
  id: string;
  workspaceId: string;
  projectId?: string;
  title: string;
  summary?: string;
  status: WorkstreamStatus;
  createdBy?: {
    type: "agent" | "human" | "system";
    id?: string;
    name?: string;
  };
  startedAt: number;
  endedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type Artifact = {
  id: string;
  workspaceId: string;
  projectId?: string;
  workstreamId?: string;
  type: ArtifactType;
  title: string;
  summary?: string;
  url?: string;
  storageId?: string;
  content?: string;
  metadata?: unknown;
  sizeBytes?: number;
  language?: string;
  filePath?: string;
  truncated?: boolean;
  sensitivity?: SensitivityLevel;
  redactionStatus?: RedactionStatus;
  safeForAudit?: boolean;
  sensitiveFindings?: SensitiveFinding[];
  reviewedBy?: EvidenceReviewer;
  reviewedAt?: number;
  createdAt: number;
};

export type Source = {
  id: string;
  workspaceId: string;
  name: string;
  type: EventSource;
  status: SourceStatus;
  metadata?: unknown;
  createdAt: number;
  updatedAt: number;
};

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  slug?: string;
  repositoryUrl?: string;
  localPath?: string;
  createdAt: number;
  updatedAt: number;
};
