export const EVENT_SOURCES = {
  CURSOR: "cursor",
  CLAUDE_CODE: "claude_code",
  CODEX: "codex",
  SDK: "sdk",
  GITHUB: "github",
  STRIPE: "stripe",
  POSTHOG: "posthog",
  SLACK: "slack",
  LINEAR: "linear",
  MANUAL: "manual",
  SYSTEM: "system",
  WATCHER: "watcher",
  CLI: "cli",
  OTHER: "other",
} as const;

export const EVENT_CATEGORIES = {
  AGENT_ACTION: "agent_action",
  CODE_CHANGE: "code_change",
  PRODUCT_EVENT: "product_event",
  COMPANY_DECISION: "company_decision",
  DECISION: "decision",
  OBSERVABILITY: "observability",
  REVENUE_EVENT: "revenue_event",
  SYSTEM_EVENT: "system_event",
} as const;

export const ACTOR_TYPES = {
  AGENT: "agent",
  HUMAN: "human",
  SYSTEM: "system",
  CUSTOMER: "customer",
} as const;

export const ARTIFACT_TYPES = {
  DIFF: "diff",
  FILE: "file",
  URL: "url",
  SCREENSHOT: "screenshot",
  DOCUMENT: "document",
  LOG: "log",
  COMMAND_OUTPUT: "command_output",
  OTHER: "other",
} as const;

export const EVENT_SEVERITIES = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
} as const;

export const SOURCE_STATUSES = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
} as const;

export const WORKSTREAM_STATUSES = {
  ACTIVE: "active",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const;

export const ENTITY_TYPES = {
  FILE: "file",
  USER: "user",
  CUSTOMER: "customer",
  FEATURE: "feature",
  PROJECT: "project",
  WORKSPACE: "workspace",
  PULL_REQUEST: "pull_request",
  ISSUE: "issue",
  PAYMENT: "payment",
  SUBSCRIPTION: "subscription",
  OTHER: "other",
} as const;

export type EventSource = (typeof EVENT_SOURCES)[keyof typeof EVENT_SOURCES];
export type EventCategory = (typeof EVENT_CATEGORIES)[keyof typeof EVENT_CATEGORIES];
export type ActorType = (typeof ACTOR_TYPES)[keyof typeof ACTOR_TYPES];
export type ArtifactType = (typeof ARTIFACT_TYPES)[keyof typeof ARTIFACT_TYPES];
export type EventSeverity = (typeof EVENT_SEVERITIES)[keyof typeof EVENT_SEVERITIES];
export type SourceStatus = (typeof SOURCE_STATUSES)[keyof typeof SOURCE_STATUSES];
export type WorkstreamStatus = (typeof WORKSTREAM_STATUSES)[keyof typeof WORKSTREAM_STATUSES];
export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];

/** Example event `type` strings per category — documentation for MCP/SDK authors. */
export const EVENT_TYPE_EXAMPLES = {
  [EVENT_CATEGORIES.AGENT_ACTION]: [
    "agent.prompt",
    "agent.plan_created",
    "agent.tool_called",
    "agent.decision_made",
    "agent.task_completed",
  ],
  [EVENT_CATEGORIES.CODE_CHANGE]: [
    "file.read",
    "file.changed",
    "code.diff_created",
    "command.completed",
    "command.failed",
    "build.passed",
    "build.failed",
  ],
  [EVENT_CATEGORIES.PRODUCT_EVENT]: [
    "user.signed_up",
    "user.activated",
    "feature.used",
    "trial.started",
    "customer.churned",
  ],
  [EVENT_CATEGORIES.COMPANY_DECISION]: [
    "decision.made",
    "roadmap.changed",
    "pricing.changed",
    "budget.approved",
    "feature.approved",
  ],
  [EVENT_CATEGORIES.OBSERVABILITY]: [
    "observability.signal_received",
    "observability.deploy_failed",
    "observability.incident_opened",
    "observability.incident_resolved",
  ],
  [EVENT_CATEGORIES.REVENUE_EVENT]: [
    "payment.received",
    "subscription.created",
    "subscription.cancelled",
    "invoice.paid",
    "refund.issued",
  ],
  [EVENT_CATEGORIES.SYSTEM_EVENT]: [
    "source.connected",
    "source.disconnected",
    "workspace.created",
    "api_key.created",
    "command.started",
    "command.completed",
    "command.failed",
    "cli.doctor_passed",
  ],
} as const;
