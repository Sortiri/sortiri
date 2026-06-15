import { v } from "convex/values";

export const actorTypeValidator = v.union(
  v.literal("agent"),
  v.literal("human"),
  v.literal("system"),
  v.literal("customer"),
);

export const actorValidator = v.object({
  type: actorTypeValidator,
  id: v.optional(v.string()),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
});

export const createdByValidator = v.object({
  type: v.union(v.literal("agent"), v.literal("human"), v.literal("system")),
  id: v.optional(v.string()),
  name: v.optional(v.string()),
});

export const integrationCreatedByValidator = v.object({
  clerkUserId: v.optional(v.string()),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
});

export const integrationSourceValidator = v.union(
  v.literal("github"),
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("slack"),
  v.literal("linear"),
  v.literal("other"),
);

export const integrationConnectionStatusValidator = v.union(
  v.literal("connected"),
  v.literal("not_connected"),
  v.literal("error"),
  v.literal("revoked"),
);

export const integrationSecretStatusValidator = v.union(
  v.literal("active"),
  v.literal("revoked"),
);

export const entityTypeValidator = v.union(
  v.literal("file"),
  v.literal("user"),
  v.literal("customer"),
  v.literal("feature"),
  v.literal("project"),
  v.literal("workspace"),
  v.literal("pull_request"),
  v.literal("issue"),
  v.literal("payment"),
  v.literal("subscription"),
  v.literal("command"),
  v.literal("source"),
  v.literal("actor"),
  v.literal("other"),
);

export const entityValidator = v.object({
  type: entityTypeValidator,
  id: v.optional(v.string()),
  name: v.optional(v.string()),
  url: v.optional(v.string()),
});

export const entityRecordValidator = v.object({
  workspaceId: v.id("workspaces"),
  type: entityTypeValidator,
  key: v.string(),
  name: v.string(),
  url: v.optional(v.string()),
  source: v.optional(v.string()),
  eventCount: v.number(),
  workstreamCount: v.optional(v.number()),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const eventSourceValidator = v.union(
  v.literal("cursor"),
  v.literal("claude_code"),
  v.literal("codex"),
  v.literal("sdk"),
  v.literal("github"),
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("slack"),
  v.literal("linear"),
  v.literal("manual"),
  v.literal("system"),
  v.literal("watcher"),
  v.literal("cli"),
  v.literal("other"),
);

export const eventLinkTypeValidator = v.union(
  v.literal("same_workstream"),
  v.literal("same_entity"),
  v.literal("same_file"),
  v.literal("same_pr"),
  v.literal("same_actor"),
  v.literal("temporal"),
  v.literal("caused_by"),
  v.literal("led_to"),
  v.literal("related"),
  v.literal("manual"),
);

export const eventLinkCreatedByValidator = v.union(
  v.literal("system"),
  v.literal("agent"),
  v.literal("human"),
);

export const eventCategoryValidator = v.union(
  v.literal("agent_action"),
  v.literal("code_change"),
  v.literal("product_event"),
  v.literal("company_decision"),
  v.literal("revenue_event"),
  v.literal("system_event"),
);

export const artifactTypeValidator = v.union(
  v.literal("diff"),
  v.literal("file"),
  v.literal("url"),
  v.literal("screenshot"),
  v.literal("document"),
  v.literal("log"),
  v.literal("command_output"),
  v.literal("other"),
);

export const severityValidator = v.union(
  v.literal("info"),
  v.literal("warning"),
  v.literal("error"),
  v.literal("critical"),
);

export const importanceValidator = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("critical"),
);

export const visibilityValidator = v.union(
  v.literal("primary"),
  v.literal("debug"),
  v.literal("hidden"),
);

export const sourceTypeValidator = v.union(
  v.literal("cursor"),
  v.literal("claude_code"),
  v.literal("codex"),
  v.literal("sdk"),
  v.literal("github"),
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("slack"),
  v.literal("linear"),
  v.literal("manual"),
  v.literal("system"),
  v.literal("watcher"),
  v.literal("cli"),
  v.literal("other"),
);

export const sourceStatusValidator = v.union(
  v.literal("connected"),
  v.literal("disconnected"),
  v.literal("error"),
);

export const workstreamStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("archived"),
);

export const insightRunStatusValidator = v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("failed"),
);

export const insightFindingSeverityValidator = v.union(
  v.literal("info"),
  v.literal("warning"),
  v.literal("critical"),
);

export const insightFindingTypeValidator = v.union(
  v.literal("hotspot"),
  v.literal("risk"),
  v.literal("sensitive_evidence"),
  v.literal("duplicate_work"),
  v.literal("error"),
  v.literal("stale_workstream"),
  v.literal("product_movement"),
  v.literal("decision"),
  v.literal("summary"),
  v.literal("impact_opportunity"),
  v.literal("lesson_opportunity"),
  v.literal("other"),
);

export const impactAnalysisStatusValidator = v.union(
  v.literal("draft"),
  v.literal("generated"),
  v.literal("failed"),
  v.literal("archived"),
);

export const impactAnchorTypeValidator = v.union(
  v.literal("event"),
  v.literal("workstream"),
  v.literal("project"),
  v.literal("view"),
  v.literal("entity"),
  v.literal("manual"),
);

export const impactAnchorValidator = v.object({
  type: impactAnchorTypeValidator,
  eventId: v.optional(v.id("events")),
  workstreamId: v.optional(v.id("workstreams")),
  projectId: v.optional(v.id("projects")),
  viewId: v.optional(v.id("savedViews")),
  entityId: v.optional(v.id("entities")),
  title: v.string(),
  occurredAt: v.number(),
});

export const impactWindowValidator = v.object({
  beforeMs: v.number(),
  afterMs: v.number(),
  baselineStart: v.number(),
  baselineEnd: v.number(),
  impactStart: v.number(),
  impactEnd: v.number(),
});

export const impactFiltersValidator = v.object({
  categories: v.optional(v.array(v.string())),
  sources: v.optional(v.array(v.string())),
  entityTypes: v.optional(v.array(v.string())),
  projectIds: v.optional(v.array(v.id("projects"))),
  visibility: v.optional(v.union(v.literal("primary"), v.literal("all"))),
});

export const impactFindingTypeValidator = v.union(
  v.literal("product_movement"),
  v.literal("revenue_movement"),
  v.literal("activation_movement"),
  v.literal("feature_usage"),
  v.literal("customer_activity"),
  v.literal("payment_activity"),
  v.literal("negative_signal"),
  v.literal("related_work"),
  v.literal("risk"),
  v.literal("other"),
);

export const impactFindingSeverityValidator = v.union(
  v.literal("info"),
  v.literal("warning"),
  v.literal("critical"),
);

export const impactConfidenceValidator = v.union(
  v.literal("possible"),
  v.literal("likely"),
  v.literal("strong"),
);

export const impactWindowPresetValidator = v.union(
  v.literal("24h"),
  v.literal("7d"),
  v.literal("30d"),
);

export const lessonTypeValidator = v.union(
  v.literal("positive_pattern"),
  v.literal("negative_pattern"),
  v.literal("risk"),
  v.literal("validation"),
  v.literal("product_learning"),
  v.literal("revenue_learning"),
  v.literal("engineering_learning"),
  v.literal("process_learning"),
  v.literal("security_learning"),
  v.literal("other"),
);

export const lessonStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("archived"),
);

export const lessonConfidenceValidator = v.union(
  v.literal("possible"),
  v.literal("likely"),
  v.literal("strong"),
);

export const lessonImportanceValidator = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("critical"),
);

export const lessonSourceValidator = v.union(
  v.literal("impact_analysis"),
  v.literal("insight"),
  v.literal("manual"),
  v.literal("failure_pattern"),
  v.literal("decision"),
  v.literal("system"),
);

export const playbookTypeValidator = v.union(
  v.literal("engineering"),
  v.literal("product"),
  v.literal("revenue"),
  v.literal("security"),
  v.literal("audit"),
  v.literal("integration"),
  v.literal("growth"),
  v.literal("support"),
  v.literal("custom"),
);

export const playbookStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("archived"),
);

export const playbookStepValidator = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  required: v.optional(v.boolean()),
  order: v.optional(v.number()),
});

export const playbookValidationRequirementValidator = v.object({
  title: v.string(),
  command: v.optional(v.string()),
  reason: v.optional(v.string()),
  required: v.optional(v.boolean()),
});

export const insightWindowValidator = v.union(
  v.literal("24h"),
  v.literal("7d"),
  v.literal("30d"),
);

export const savedViewTypeValidator = v.union(
  v.literal("engineering"),
  v.literal("product"),
  v.literal("revenue"),
  v.literal("growth"),
  v.literal("support"),
  v.literal("executive"),
  v.literal("custom"),
);

export const savedViewSharingValidator = v.union(
  v.literal("workspace"),
  v.literal("private"),
);

export const workspaceRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
  v.literal("viewer"),
  v.literal("auditor"),
);

/** Roles that can be assigned to saved view sharing (excludes auditor). */
export const viewAllowedRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
  v.literal("viewer"),
);

export const auditReportStatusValidator = v.union(
  v.literal("draft"),
  v.literal("finalized"),
  v.literal("archived"),
);

export const auditReportItemTypeValidator = v.union(
  v.literal("event"),
  v.literal("workstream"),
  v.literal("artifact"),
  v.literal("entity"),
  v.literal("insight"),
  v.literal("impact_analysis"),
  v.literal("lesson"),
  v.literal("playbook"),
  v.literal("note"),
);

export const auditReportAccessLevelValidator = v.union(
  v.literal("viewer"),
  v.literal("reviewer"),
);

export const auditReportScopeValidator = v.object({
  projectIds: v.optional(v.array(v.id("projects"))),
  viewId: v.optional(v.id("savedViews")),
  entityIds: v.optional(v.array(v.id("entities"))),
  impactAnalysisId: v.optional(v.id("impactAnalyses")),
  lessonIds: v.optional(v.array(v.id("lessons"))),
  playbookIds: v.optional(v.array(v.id("playbooks"))),
  windowStart: v.optional(v.number()),
  windowEnd: v.optional(v.number()),
  categories: v.optional(v.array(v.string())),
  sources: v.optional(v.array(v.string())),
  visibility: v.optional(v.union(v.literal("primary"), v.literal("all"))),
});

export const sensitivityValidator = v.union(
  v.literal("public"),
  v.literal("internal"),
  v.literal("confidential"),
  v.literal("restricted"),
);

export const redactionStatusValidator = v.union(
  v.literal("none"),
  v.literal("redacted"),
  v.literal("needs_review"),
  v.literal("approved"),
  v.literal("blocked"),
);

export const sensitiveFindingSeverityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

export const sensitiveFindingValidator = v.object({
  type: v.string(),
  label: v.string(),
  count: v.number(),
  severity: sensitiveFindingSeverityValidator,
});

export const evidenceReviewerValidator = v.object({
  clerkUserId: v.optional(v.string()),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
});

export const evidenceSafetySummaryValidator = v.object({
  includedItems: v.number(),
  excludedArtifacts: v.number(),
  excludedEvents: v.number(),
  needsReview: v.number(),
  blocked: v.number(),
});

export const eventVisibilityFilterValidator = v.union(
  v.literal("primary"),
  v.literal("debug"),
  v.literal("all"),
);

export const contextPackStatusValidator = v.union(
  v.literal("generated"),
  v.literal("failed"),
  v.literal("archived"),
);

export const contextPackItemTypeValidator = v.union(
  v.literal("event"),
  v.literal("workstream"),
  v.literal("entity"),
  v.literal("decision"),
  v.literal("impact_analysis"),
  v.literal("lesson"),
  v.literal("playbook"),
  v.literal("insight"),
  v.literal("artifact"),
  v.literal("validation_requirement"),
  v.literal("known_failure"),
  v.literal("note"),
);

export const contextPackRequestedByValidator = v.object({
  type: v.optional(v.string()),
  clerkUserId: v.optional(v.string()),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  source: v.optional(v.string()),
});

export const contextPackRequestValidator = v.object({
  prompt: v.optional(v.string()),
  files: v.optional(v.array(v.string())),
  entities: v.optional(v.array(v.string())),
  sources: v.optional(v.array(v.string())),
  categories: v.optional(v.array(v.string())),
  timeWindowMs: v.optional(v.number()),
});

export const contextPackCountsValidator = v.object({
  events: v.number(),
  workstreams: v.number(),
  entities: v.number(),
  decisions: v.number(),
  impacts: v.number(),
  lessons: v.number(),
  playbooks: v.number(),
  insights: v.number(),
  artifacts: v.number(),
  failures: v.number(),
  validationRequirements: v.number(),
});

export const recommendationTypeValidator = v.union(
  v.literal("investigate"),
  v.literal("fix"),
  v.literal("improve"),
  v.literal("validate"),
  v.literal("review"),
  v.literal("monitor"),
  v.literal("create_playbook"),
  v.literal("create_lesson"),
  v.literal("security_review"),
  v.literal("audit_review"),
  v.literal("other"),
);

export const recommendationSourceValidator = v.union(
  v.literal("insight"),
  v.literal("impact_analysis"),
  v.literal("lesson"),
  v.literal("playbook"),
  v.literal("known_failure"),
  v.literal("source_health"),
  v.literal("posthog"),
  v.literal("stripe"),
  v.literal("github"),
  v.literal("system"),
  v.literal("manual"),
);

export const recommendationStatusValidator = v.union(
  v.literal("open"),
  v.literal("accepted"),
  v.literal("dismissed"),
  v.literal("converted_to_workstream"),
  v.literal("archived"),
);

export const recommendationPriorityValidator = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("critical"),
);

export const recommendationConfidenceValidator = v.union(
  v.literal("possible"),
  v.literal("likely"),
  v.literal("strong"),
);

export const recommendationValidationRequirementValidator = v.object({
  title: v.string(),
  command: v.optional(v.string()),
  reason: v.optional(v.string()),
  required: v.optional(v.boolean()),
});

export const recommendationCreatedByValidator = v.object({
  type: v.optional(v.string()),
  clerkUserId: v.optional(v.string()),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
});

export const evalSuiteSourceValidator = v.union(
  v.literal("playbook"),
  v.literal("lesson"),
  v.literal("recommendation"),
  v.literal("context_pack"),
  v.literal("known_failure"),
  v.literal("manual"),
  v.literal("system"),
);

export const evalSuiteStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("archived"),
);

export const evalSuitePriorityValidator = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("critical"),
);

export const evalSuiteCreatedByValidator = v.object({
  clerkUserId: v.optional(v.string()),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  source: v.optional(v.string()),
});

export const evalCaseTypeValidator = v.union(
  v.literal("command"),
  v.literal("route_check"),
  v.literal("http_api_check"),
  v.literal("source_webhook_check"),
  v.literal("permission_check"),
  v.literal("evidence_safety_check"),
  v.literal("context_quality_check"),
  v.literal("playbook_step_check"),
  v.literal("no_secret_leak_check"),
  v.literal("manual_review"),
);

export const evalRunStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("passed"),
  v.literal("failed"),
  v.literal("needs_review"),
  v.literal("error"),
);

export const evalResultStatusValidator = v.union(
  v.literal("passed"),
  v.literal("failed"),
  v.literal("skipped"),
  v.literal("needs_review"),
  v.literal("error"),
);

export const savedViewFiltersValidator = v.object({
  projectIds: v.optional(v.array(v.id("projects"))),
  categories: v.optional(v.array(eventCategoryValidator)),
  sources: v.optional(v.array(v.string())),
  entityTypes: v.optional(v.array(v.string())),
  entityIds: v.optional(v.array(v.id("entities"))),
  actorTypes: v.optional(v.array(v.string())),
  importance: v.optional(v.array(importanceValidator)),
  visibility: v.optional(eventVisibilityFilterValidator),
  query: v.optional(v.string()),
});
