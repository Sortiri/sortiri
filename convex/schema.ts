import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  actorValidator,
  artifactTypeValidator,
  createdByValidator,
  entityValidator,
  entityTypeValidator,
  eventCategoryValidator,
  eventLinkCreatedByValidator,
  eventLinkTypeValidator,
  eventSourceValidator,
  insightFindingSeverityValidator,
  insightFindingTypeValidator,
  insightRunStatusValidator,
  severityValidator,
  importanceValidator,
  visibilityValidator,
  sourceStatusValidator,
  sourceTypeValidator,
  workstreamStatusValidator,
} from "./lib/validators";

export default defineSchema({
  onboardingProfiles: defineTable({
    userId: v.string(),
    companyName: v.string(),
    timelineName: v.string(),
    companyType: v.optional(v.string()),
    trackTypes: v.array(v.string()),
    tools: v.array(v.string()),
    exampleQuestion: v.optional(v.string()),
    currentStep: v.number(),
    completedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_userId", ["userId"]),

  workspaces: defineTable({
    externalId: v.string(),
    userId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    clerkOrgId: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_externalId", ["externalId"])
    .index("by_clerk_org", ["clerkOrgId"]),

  userWorkspacePrefs: defineTable({
    userId: v.string(),
    activeWorkspaceExternalId: v.string(),
    updatedAt: v.string(),
  }).index("by_userId", ["userId"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer"),
    ),
    status: v.union(v.literal("active"), v.literal("removed")),
    joinedAt: v.optional(v.number()),
    invitedBy: v.optional(
      v.object({
        clerkUserId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["clerkUserId"])
    .index("by_workspace_user", ["workspaceId", "clerkUserId"])
    .index("by_workspace_role", ["workspaceId", "role"]),

  workspaceInvites: defineTable({
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
    tokenHash: v.string(),
    tokenPrefix: v.string(),
    last4: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    expiresAt: v.number(),
    invitedBy: v.optional(
      v.object({
        clerkUserId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    ),
    acceptedByUserId: v.optional(v.string()),
    acceptedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_email", ["email"])
    .index("by_token_prefix", ["tokenPrefix"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  projects: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    repositoryUrl: v.optional(v.string()),
    localPath: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("archived")),
    ),
    lastEventAt: v.optional(v.number()),
    eventCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_repositoryUrl", ["workspaceId", "repositoryUrl"]),

  cliSetupTokens: defineTable({
    workspaceId: v.id("workspaces"),
    tokenHash: v.string(),
    tokenPrefix: v.string(),
    last4: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("used"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    createdBy: v.optional(
      v.object({
        userId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_token_prefix", ["tokenPrefix"])
    .index("by_token_hash", ["tokenHash"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  sources: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    type: sourceTypeValidator,
    status: sourceStatusValidator,
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_type", ["workspaceId", "type"]),

  workstreams: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    summary: v.optional(v.string()),
    status: workstreamStatusValidator,
    createdBy: v.optional(createdByValidator),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    searchText: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  artifacts: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    type: artifactTypeValidator,
    title: v.string(),
    summary: v.optional(v.string()),
    url: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    content: v.optional(v.string()),
    metadata: v.optional(v.any()),
    sizeBytes: v.optional(v.number()),
    language: v.optional(v.string()),
    filePath: v.optional(v.string()),
    truncated: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workstream", ["workstreamId"]),

  events: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    sourceId: v.optional(v.id("sources")),
    source: eventSourceValidator,
    category: eventCategoryValidator,
    type: v.string(),
    actor: actorValidator,
    title: v.string(),
    summary: v.optional(v.string()),
    entity: v.optional(entityValidator),
    artifactIds: v.optional(v.array(v.id("artifacts"))),
    data: v.optional(v.any()),
    severity: v.optional(severityValidator),
    tags: v.optional(v.array(v.string())),
    importance: v.optional(importanceValidator),
    visibility: v.optional(visibilityValidator),
    displayReason: v.optional(v.string()),
    isUserPinned: v.optional(v.boolean()),
    isUserHidden: v.optional(v.boolean()),
    searchText: v.optional(v.string()),
    occurredAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_occurred_at", ["workspaceId", "occurredAt"])
    .index("by_workstream", ["workstreamId"])
    .index("by_project", ["projectId"])
    .index("by_category", ["workspaceId", "category"])
    .index("by_source", ["workspaceId", "source"])
    .index("by_type", ["workspaceId", "type"]),

  entities: defineTable({
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
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_type", ["workspaceId", "type"])
    .index("by_workspace_type_key", ["workspaceId", "type", "key"])
    .index("by_workspace_last_seen", ["workspaceId", "lastSeenAt"]),

  askSessions: defineTable({
    workspaceId: v.id("workspaces"),
    threadId: v.string(),
    question: v.string(),
    answer: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    evidenceEventIds: v.optional(v.array(v.id("events"))),
    evidenceWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_created_at", ["workspaceId", "createdAt"])
    .index("by_thread", ["threadId"]),

  insightRuns: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    viewId: v.optional(v.id("savedViews")),
    title: v.string(),
    summary: v.optional(v.string()),
    status: insightRunStatusValidator,
    windowStart: v.number(),
    windowEnd: v.number(),
    generatedBy: v.optional(createdByValidator),
    eventCount: v.optional(v.number()),
    workstreamCount: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_created_at", ["workspaceId", "createdAt"])
    .index("by_workspace_project", ["workspaceId", "projectId"]),

  insightFindings: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    viewId: v.optional(v.id("savedViews")),
    runId: v.id("insightRuns"),
    type: insightFindingTypeValidator,
    severity: insightFindingSeverityValidator,
    title: v.string(),
    summary: v.string(),
    recommendation: v.optional(v.string()),
    evidenceEventIds: v.optional(v.array(v.id("events"))),
    evidenceWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
    data: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_run", ["runId"])
    .index("by_workspace_type", ["workspaceId", "type"]),

  apiKeys: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    keyPrefix: v.string(),
    keyHash: v.string(),
    last4: v.string(),
    status: v.union(v.literal("active"), v.literal("revoked")),
    createdBy: v.optional(
      v.object({
        userId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    ),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_key_prefix", ["keyPrefix"])
    .index("by_key_hash", ["keyHash"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  githubWebhookSecrets: defineTable({
    workspaceId: v.id("workspaces"),
    secret: v.string(),
    last4: v.string(),
    status: v.union(v.literal("active"), v.literal("revoked")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  integrationDeliveries: defineTable({
    workspaceId: v.id("workspaces"),
    source: v.string(),
    deliveryId: v.string(),
    eventType: v.optional(v.string()),
    status: v.union(v.literal("processed"), v.literal("failed")),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_source_delivery", ["source", "deliveryId"])
    .index("by_workspace", ["workspaceId"]),

  eventLinks: defineTable({
    workspaceId: v.id("workspaces"),
    fromEventId: v.optional(v.id("events")),
    toEventId: v.optional(v.id("events")),
    fromWorkstreamId: v.optional(v.id("workstreams")),
    toWorkstreamId: v.optional(v.id("workstreams")),
    type: eventLinkTypeValidator,
    confidence: v.number(),
    reason: v.string(),
    createdBy: eventLinkCreatedByValidator,
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_from_event", ["fromEventId"])
    .index("by_to_event", ["toEventId"])
    .index("by_from_workstream", ["fromWorkstreamId"])
    .index("by_to_workstream", ["toWorkstreamId"])
    .index("by_workspace_type", ["workspaceId", "type"])
    .index("by_workspace_from_to_type", [
      "workspaceId",
      "fromEventId",
      "toEventId",
      "type",
    ]),

  pinnedReplays: defineTable({
    workspaceId: v.id("workspaces"),
    workstreamId: v.id("workstreams"),
    pinnedBy: v.optional(
      v.object({
        userId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    ),
    label: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workstream", ["workstreamId"])
    .index("by_workspace_workstream", ["workspaceId", "workstreamId"]),

  savedViews: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("engineering"),
      v.literal("product"),
      v.literal("revenue"),
      v.literal("growth"),
      v.literal("support"),
      v.literal("executive"),
      v.literal("custom"),
    ),
    visibility: v.union(v.literal("workspace"), v.literal("private")),
    ownerUserId: v.optional(v.string()),
    allowedRoles: v.optional(
      v.array(
        v.union(
          v.literal("owner"),
          v.literal("admin"),
          v.literal("member"),
          v.literal("viewer"),
        ),
      ),
    ),
    filters: v.object({
      projectIds: v.optional(v.array(v.id("projects"))),
      categories: v.optional(
        v.array(
          v.union(
            v.literal("agent_action"),
            v.literal("code_change"),
            v.literal("product_event"),
            v.literal("company_decision"),
            v.literal("revenue_event"),
            v.literal("system_event"),
          ),
        ),
      ),
      sources: v.optional(v.array(v.string())),
      entityTypes: v.optional(v.array(v.string())),
      entityIds: v.optional(v.array(v.id("entities"))),
      actorTypes: v.optional(v.array(v.string())),
      importance: v.optional(
        v.array(
          v.union(
            v.literal("low"),
            v.literal("normal"),
            v.literal("high"),
            v.literal("critical"),
          ),
        ),
      ),
      visibility: v.optional(
        v.union(v.literal("primary"), v.literal("debug"), v.literal("all")),
      ),
      query: v.optional(v.string()),
    }),
    isDefault: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_type", ["workspaceId", "type"])
    .index("by_workspace_pinned", ["workspaceId", "isPinned"])
    .index("by_owner", ["ownerUserId"]),
});
