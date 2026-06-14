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
  v.literal("duplicate_work"),
  v.literal("error"),
  v.literal("stale_workstream"),
  v.literal("product_movement"),
  v.literal("decision"),
  v.literal("summary"),
  v.literal("other"),
);

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
);

export const eventVisibilityFilterValidator = v.union(
  v.literal("primary"),
  v.literal("debug"),
  v.literal("all"),
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
