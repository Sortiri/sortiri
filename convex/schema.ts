import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  actorValidator,
  artifactTypeValidator,
  auditReportScopeValidator,
  createdByValidator,
  entityValidator,
  entityTypeValidator,
  eventCategoryValidator,
  eventLinkCreatedByValidator,
  eventLinkTypeValidator,
  eventSourceValidator,
  evidenceReviewerValidator,
  evidenceSafetySummaryValidator,
  impactAnalysisStatusValidator,
  impactAnchorValidator,
  impactConfidenceValidator,
  impactFiltersValidator,
  impactFindingSeverityValidator,
  impactFindingTypeValidator,
  impactWindowValidator,
  integrationCreatedByValidator,
  integrationSourceValidator,
  insightFindingSeverityValidator,
  insightFindingTypeValidator,
  insightRunStatusValidator,
  lessonConfidenceValidator,
  lessonImportanceValidator,
  lessonSourceValidator,
  lessonStatusValidator,
  lessonTypeValidator,
  playbookStatusValidator,
  playbookStepValidator,
  playbookTypeValidator,
  playbookValidationRequirementValidator,
  contextPackCountsValidator,
  contextPackItemTypeValidator,
  contextPackRequestedByValidator,
  contextPackRequestValidator,
  contextPackStatusValidator,
  recommendationConfidenceValidator,
  recommendationCreatedByValidator,
  recommendationPriorityValidator,
  remediationStatusValidator,
  recommendationSourceValidator,
  recommendationStatusValidator,
  recommendationTypeValidator,
  recommendationValidationRequirementValidator,
  evalSuiteSourceValidator,
  evalSuiteStatusValidator,
  evalSuitePriorityValidator,
  evalSuiteCreatedByValidator,
  evalCaseTypeValidator,
  evalRunStatusValidator,
  evalResultStatusValidator,
  auditReportItemTypeValidator,
  decidedByValidator,
  decisionCandidateConfidenceValidator,
  decisionCandidateStatusValidator,
  decisionSourceRefValidator,
  decisionSourceValidator,
  decisionStatusValidator,
  decisionTypeValidator,
  rollbackSourceValidator,
  slackCaptureModeValidator,
  observabilitySourceValidator,
  observabilitySignalTypeValidator,
  incidentStatusValidator,
  incidentSeverityValidator,
  incidentSourceValidator,
  incidentSourceRefValidator,
  redactionStatusValidator,
  sensitivityValidator,
  sensitiveFindingValidator,
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
      v.literal("auditor"),
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
    role: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer"),
      v.literal("auditor"),
    ),
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

  projectAccess: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    memberId: v.id("workspaceMembers"),
    accessLevel: v.union(
      v.literal("owner"),
      v.literal("manager"),
      v.literal("editor"),
      v.literal("viewer"),
    ),
    grantedBy: v.optional(
      v.object({
        clerkUserId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    ),
    status: v.union(v.literal("active"), v.literal("revoked")),
    createdAt: v.number(),
    updatedAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_member", ["memberId"])
    .index("by_project_member", ["projectId", "memberId"])
    .index("by_workspace_member", ["workspaceId", "memberId"]),

  auditReports: defineTable({
    workspaceId: v.id("workspaces"),
    title: v.string(),
    summary: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("finalized"),
      v.literal("archived"),
    ),
    scope: auditReportScopeValidator,
    snapshotEventIds: v.optional(v.array(v.id("events"))),
    snapshotWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
    snapshotArtifactIds: v.optional(v.array(v.id("artifacts"))),
    snapshotEntityIds: v.optional(v.array(v.id("entities"))),
    generatedSummary: v.optional(v.string()),
    safetySummary: v.optional(evidenceSafetySummaryValidator),
    createdBy: v.optional(
      v.object({
        clerkUserId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    ),
    finalizedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_created_at", ["workspaceId", "createdAt"]),

  auditReportItems: defineTable({
    workspaceId: v.id("workspaces"),
    reportId: v.id("auditReports"),
    itemType: auditReportItemTypeValidator,
    eventId: v.optional(v.id("events")),
    workstreamId: v.optional(v.id("workstreams")),
    artifactId: v.optional(v.id("artifacts")),
    entityId: v.optional(v.id("entities")),
    insightFindingId: v.optional(v.id("insightFindings")),
    impactAnalysisId: v.optional(v.id("impactAnalyses")),
    lessonId: v.optional(v.id("lessons")),
    playbookId: v.optional(v.id("playbooks")),
    decisionId: v.optional(v.id("decisions")),
    rollbackId: v.optional(v.id("rollbackEvents")),
    decisionCandidateId: v.optional(v.id("decisionCandidates")),
    incidentId: v.optional(v.id("incidents")),
    observabilitySignalId: v.optional(v.id("observabilitySignals")),
    title: v.string(),
    summary: v.optional(v.string()),
    reason: v.optional(v.string()),
    order: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_workspace", ["workspaceId"]),

  auditReportAccess: defineTable({
    workspaceId: v.id("workspaces"),
    reportId: v.id("auditReports"),
    memberId: v.id("workspaceMembers"),
    accessLevel: v.union(v.literal("viewer"), v.literal("reviewer")),
    status: v.union(v.literal("active"), v.literal("revoked")),
    grantedBy: v.optional(
      v.object({
        clerkUserId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_report", ["reportId"])
    .index("by_member", ["memberId"])
    .index("by_report_member", ["reportId", "memberId"]),

  auditShareLinks: defineTable({
    workspaceId: v.id("workspaces"),
    reportId: v.id("auditReports"),
    tokenHash: v.string(),
    tokenPrefix: v.string(),
    last4: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("revoked"),
      v.literal("expired"),
    ),
    expiresAt: v.number(),
    createdBy: v.optional(
      v.object({
        clerkUserId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    ),
    lastAccessedAt: v.optional(v.number()),
    accessCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_report", ["reportId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_token_prefix", ["tokenPrefix"])
    .index("by_report_status", ["reportId", "status"]),

  auditExports: defineTable({
    workspaceId: v.id("workspaces"),
    reportId: v.id("auditReports"),
    format: v.union(
      v.literal("markdown"),
      v.literal("html"),
      v.literal("json"),
    ),
    status: v.union(v.literal("generated"), v.literal("failed")),
    generatedBy: v.optional(
      v.object({
        clerkUserId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    ),
    sizeBytes: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_workspace", ["workspaceId"]),

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
    sensitivity: v.optional(sensitivityValidator),
    redactionStatus: v.optional(redactionStatusValidator),
    safeForAudit: v.optional(v.boolean()),
    sensitiveFindings: v.optional(v.array(sensitiveFindingValidator)),
    reviewedBy: v.optional(evidenceReviewerValidator),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workstream", ["workstreamId"])
    .index("by_workspace_redaction_status", ["workspaceId", "redactionStatus"]),

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
    sensitivity: v.optional(sensitivityValidator),
    redactionStatus: v.optional(redactionStatusValidator),
    safeForAudit: v.optional(v.boolean()),
    sensitiveFindings: v.optional(v.array(sensitiveFindingValidator)),
    reviewedBy: v.optional(evidenceReviewerValidator),
    reviewedAt: v.optional(v.number()),
    occurredAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_occurred_at", ["workspaceId", "occurredAt"])
    .index("by_workstream", ["workstreamId"])
    .index("by_project", ["projectId"])
    .index("by_category", ["workspaceId", "category"])
    .index("by_source", ["workspaceId", "source"])
    .index("by_type", ["workspaceId", "type"])
    .index("by_workspace_redaction_status", ["workspaceId", "redactionStatus"]),

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

  impactAnalyses: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    viewId: v.optional(v.id("savedViews")),
    title: v.string(),
    summary: v.optional(v.string()),
    status: impactAnalysisStatusValidator,
    anchor: impactAnchorValidator,
    window: impactWindowValidator,
    filters: v.optional(impactFiltersValidator),
    metrics: v.optional(
      v.object({
        baseline: v.any(),
        impact: v.any(),
        delta: v.any(),
      }),
    ),
    generatedSummary: v.optional(v.string()),
    createdBy: v.optional(integrationCreatedByValidator),
    generatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_view", ["viewId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_created_at", ["workspaceId", "createdAt"]),

  impactFindings: defineTable({
    workspaceId: v.id("workspaces"),
    analysisId: v.id("impactAnalyses"),
    type: impactFindingTypeValidator,
    severity: impactFindingSeverityValidator,
    confidence: impactConfidenceValidator,
    title: v.string(),
    summary: v.string(),
    evidenceEventIds: v.optional(v.array(v.id("events"))),
    evidenceWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
    evidenceEntityIds: v.optional(v.array(v.id("entities"))),
    evidenceArtifactIds: v.optional(v.array(v.id("artifacts"))),
    metrics: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_analysis", ["analysisId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_type", ["workspaceId", "type"]),

  lessons: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    viewId: v.optional(v.id("savedViews")),
    workstreamId: v.optional(v.id("workstreams")),
    entityId: v.optional(v.id("entities")),
    impactAnalysisId: v.optional(v.id("impactAnalyses")),
    title: v.string(),
    summary: v.string(),
    type: lessonTypeValidator,
    status: lessonStatusValidator,
    confidence: lessonConfidenceValidator,
    importance: lessonImportanceValidator,
    source: lessonSourceValidator,
    recommendation: v.optional(v.string()),
    evidenceEventIds: v.optional(v.array(v.id("events"))),
    evidenceWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
    evidenceEntityIds: v.optional(v.array(v.id("entities"))),
    evidenceImpactAnalysisIds: v.optional(v.array(v.id("impactAnalyses"))),
    evidenceInsightFindingIds: v.optional(v.array(v.id("insightFindings"))),
    evidenceArtifactIds: v.optional(v.array(v.id("artifacts"))),
    evidenceDecisionIds: v.optional(v.array(v.id("decisions"))),
    evidenceRollbackIds: v.optional(v.array(v.id("rollbackEvents"))),
    evidenceIncidentIds: v.optional(v.array(v.id("incidents"))),
    tags: v.optional(v.array(v.string())),
    createdBy: v.optional(integrationCreatedByValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_entity", ["entityId"])
    .index("by_workstream", ["workstreamId"])
    .index("by_impact", ["impactAnalysisId"])
    .index("by_workspace_type", ["workspaceId", "type"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  playbooks: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    viewId: v.optional(v.id("savedViews")),
    title: v.string(),
    summary: v.string(),
    type: playbookTypeValidator,
    status: playbookStatusValidator,
    trigger: v.optional(v.string()),
    steps: v.array(playbookStepValidator),
    validationRequirements: v.optional(v.array(playbookValidationRequirementValidator)),
    lessonIds: v.optional(v.array(v.id("lessons"))),
    evidenceEventIds: v.optional(v.array(v.id("events"))),
    evidenceWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
    evidenceImpactAnalysisIds: v.optional(v.array(v.id("impactAnalyses"))),
    evidenceDecisionIds: v.optional(v.array(v.id("decisions"))),
    evidenceIncidentIds: v.optional(v.array(v.id("incidents"))),
    tags: v.optional(v.array(v.string())),
    createdBy: v.optional(integrationCreatedByValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_workspace_type", ["workspaceId", "type"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  contextPacks: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    viewId: v.optional(v.id("savedViews")),
    entityId: v.optional(v.id("entities")),
    playbookId: v.optional(v.id("playbooks")),
    lessonId: v.optional(v.id("lessons")),
    impactAnalysisId: v.optional(v.id("impactAnalyses")),
    title: v.string(),
    goal: v.string(),
    status: contextPackStatusValidator,
    requestedBy: v.optional(contextPackRequestedByValidator),
    request: contextPackRequestValidator,
    summary: v.optional(v.string()),
    counts: v.optional(contextPackCountsValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_workstream", ["workstreamId"])
    .index("by_entity", ["entityId"])
    .index("by_playbook", ["playbookId"])
    .index("by_lesson", ["lessonId"])
    .index("by_impact", ["impactAnalysisId"])
    .index("by_workspace_created_at", ["workspaceId", "createdAt"]),

  contextPackItems: defineTable({
    workspaceId: v.id("workspaces"),
    contextPackId: v.id("contextPacks"),
    itemType: contextPackItemTypeValidator,
    eventId: v.optional(v.id("events")),
    workstreamId: v.optional(v.id("workstreams")),
    entityId: v.optional(v.id("entities")),
    impactAnalysisId: v.optional(v.id("impactAnalyses")),
    lessonId: v.optional(v.id("lessons")),
    playbookId: v.optional(v.id("playbooks")),
    insightFindingId: v.optional(v.id("insightFindings")),
    artifactId: v.optional(v.id("artifacts")),
    title: v.string(),
    summary: v.optional(v.string()),
    reason: v.optional(v.string()),
    importance: v.optional(lessonImportanceValidator),
    confidence: v.optional(lessonConfidenceValidator),
    order: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_context_pack", ["contextPackId"])
    .index("by_workspace", ["workspaceId"]),

  recommendations: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    entityId: v.optional(v.id("entities")),
    viewId: v.optional(v.id("savedViews")),
    title: v.string(),
    summary: v.string(),
    type: recommendationTypeValidator,
    source: recommendationSourceValidator,
    status: recommendationStatusValidator,
    priority: recommendationPriorityValidator,
    confidence: recommendationConfidenceValidator,
    reason: v.optional(v.string()),
    suggestedGoal: v.optional(v.string()),
    suggestedWorkstreamTitle: v.optional(v.string()),
    recommendedPlaybookId: v.optional(v.id("playbooks")),
    generatedContextPackId: v.optional(v.id("contextPacks")),
    convertedWorkstreamId: v.optional(v.id("workstreams")),
    validationRequirements: v.optional(v.array(recommendationValidationRequirementValidator)),
    evidenceEventIds: v.optional(v.array(v.id("events"))),
    evidenceWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
    evidenceEntityIds: v.optional(v.array(v.id("entities"))),
    evidenceImpactAnalysisIds: v.optional(v.array(v.id("impactAnalyses"))),
    evidenceLessonIds: v.optional(v.array(v.id("lessons"))),
    evidencePlaybookIds: v.optional(v.array(v.id("playbooks"))),
    evidenceInsightFindingIds: v.optional(v.array(v.id("insightFindings"))),
    evidenceArtifactIds: v.optional(v.array(v.id("artifacts"))),
    evalSuiteId: v.optional(v.id("evalSuites")),
    evalRunId: v.optional(v.id("evalRuns")),
    evalResultId: v.optional(v.id("evalResults")),
    remediationStatus: v.optional(remediationStatusValidator),
    remediationWorkstreamId: v.optional(v.id("workstreams")),
    remediationContextPackId: v.optional(v.id("contextPacks")),
    remediationEvalRunId: v.optional(v.id("evalRuns")),
    dismissedReason: v.optional(v.string()),
    dedupKey: v.optional(v.string()),
    createdBy: v.optional(recommendationCreatedByValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_priority", ["workspaceId", "priority"])
    .index("by_workspace_dedup_key", ["workspaceId", "dedupKey"])
    .index("by_project", ["projectId"])
    .index("by_entity", ["entityId"])
    .index("by_workstream", ["workstreamId"])
    .index("by_eval_run", ["workspaceId", "evalRunId"]),

  evalSuites: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    recommendationId: v.optional(v.id("recommendations")),
    contextPackId: v.optional(v.id("contextPacks")),
    playbookId: v.optional(v.id("playbooks")),
    lessonId: v.optional(v.id("lessons")),
    title: v.string(),
    summary: v.string(),
    source: evalSuiteSourceValidator,
    status: evalSuiteStatusValidator,
    priority: evalSuitePriorityValidator,
    tags: v.optional(v.array(v.string())),
    dedupKey: v.optional(v.string()),
    createdBy: v.optional(evalSuiteCreatedByValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_workstream", ["workstreamId"])
    .index("by_recommendation", ["recommendationId"])
    .index("by_context_pack", ["contextPackId"])
    .index("by_playbook", ["playbookId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_dedup_key", ["workspaceId", "dedupKey"]),

  evalCases: defineTable({
    workspaceId: v.id("workspaces"),
    evalSuiteId: v.id("evalSuites"),
    title: v.string(),
    description: v.optional(v.string()),
    type: evalCaseTypeValidator,
    required: v.boolean(),
    config: v.any(),
    expected: v.optional(v.any()),
    order: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_suite", ["evalSuiteId"])
    .index("by_workspace", ["workspaceId"]),

  evalRuns: defineTable({
    workspaceId: v.id("workspaces"),
    evalSuiteId: v.id("evalSuites"),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    recommendationId: v.optional(v.id("recommendations")),
    contextPackId: v.optional(v.id("contextPacks")),
    status: evalRunStatusValidator,
    summary: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdBy: v.optional(evalSuiteCreatedByValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_suite", ["evalSuiteId"])
    .index("by_workstream", ["workstreamId"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  evalResults: defineTable({
    workspaceId: v.id("workspaces"),
    evalRunId: v.id("evalRuns"),
    evalCaseId: v.id("evalCases"),
    status: evalResultStatusValidator,
    title: v.string(),
    summary: v.optional(v.string()),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
    evidenceEventIds: v.optional(v.array(v.id("events"))),
    evidenceArtifactIds: v.optional(v.array(v.id("artifacts"))),
    evidenceWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_run", ["evalRunId"])
    .index("by_case", ["evalCaseId"])
    .index("by_workspace", ["workspaceId"]),

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

  ingestJournalEntries: defineTable({
    workspaceId: v.id("workspaces"),
    envelopeId: v.string(),
    journalRef: v.string(),
    source: v.string(),
    sourceEventId: v.string(),
    idempotencyKey: v.string(),
    receivedAt: v.number(),
    envelope: v.any(),
    createdAt: v.number(),
  })
    .index("by_journal_ref", ["journalRef"])
    .index("by_workspace", ["workspaceId"])
    .index("by_envelope_id", ["envelopeId"])
    .index("by_idempotency_key", ["idempotencyKey"]),

  ingestDeliveries: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    envelopeId: v.string(),
    idempotencyKey: v.string(),
    source: v.string(),
    sourceEventId: v.string(),
    status: v.union(
      v.literal("received"),
      v.literal("journaled"),
      v.literal("convex_written"),
      v.literal("retry_pending"),
      v.literal("dead_lettered"),
      v.literal("replayed"),
      v.literal("duplicate"),
    ),
    eventId: v.optional(v.id("events")),
    journalRef: v.optional(v.string()),
    attempts: v.number(),
    lastAttemptAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    redacted: v.optional(v.boolean()),
    sensitiveFindings: v.optional(v.array(v.string())),
    receivedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_source_event", ["workspaceId", "source", "sourceEventId"]),

  ingestDeadLetters: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    envelopeId: v.string(),
    idempotencyKey: v.string(),
    source: v.string(),
    sourceEventId: v.string(),
    journalRef: v.optional(v.string()),
    deliveryId: v.optional(v.id("ingestDeliveries")),
    reason: v.string(),
    error: v.optional(v.string()),
    payloadPreview: v.optional(v.string()),
    sensitiveFindings: v.optional(v.array(v.string())),
    redacted: v.optional(v.boolean()),
    attempts: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("replayed"),
      v.literal("ignored"),
      v.literal("archived"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_idempotency_key", ["idempotencyKey"]),

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

  integrationConnections: defineTable({
    workspaceId: v.id("workspaces"),
    source: integrationSourceValidator,
    name: v.string(),
    status: v.union(
      v.literal("connected"),
      v.literal("not_connected"),
      v.literal("error"),
      v.literal("revoked"),
    ),
    lastEventAt: v.optional(v.number()),
    eventCount: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdBy: v.optional(
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
    .index("by_workspace_source", ["workspaceId", "source"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  integrationSecrets: defineTable({
    workspaceId: v.id("workspaces"),
    connectionId: v.optional(v.id("integrationConnections")),
    source: integrationSourceValidator,
    name: v.string(),
    encryptedSecret: v.string(),
    secretLast4: v.string(),
    status: v.union(v.literal("active"), v.literal("revoked")),
    createdBy: v.optional(
      v.object({
        clerkUserId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_source", ["workspaceId", "source"])
    .index("by_connection", ["connectionId"]),

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
            v.literal("decision"),
            v.literal("observability"),
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

  decisions: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    title: v.string(),
    summary: v.optional(v.string()),
    status: decisionStatusValidator,
    decisionType: decisionTypeValidator,
    source: decisionSourceValidator,
    sourceRef: v.optional(decisionSourceRefValidator),
    decidedBy: v.optional(decidedByValidator),
    entities: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    linkedEventIds: v.optional(v.array(v.id("events"))),
    linkedWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
    linkedEntityIds: v.optional(v.array(v.id("entities"))),
    linkedArtifactIds: v.optional(v.array(v.id("artifacts"))),
    rationale: v.optional(v.string()),
    expectedOutcome: v.optional(v.string()),
    rollbackPlan: v.optional(v.string()),
    timelineEventId: v.optional(v.id("events")),
    decidedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_workstream", ["workstreamId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_created_at", ["workspaceId", "createdAt"]),

  decisionCandidates: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    source: v.union(v.literal("slack"), v.literal("system")),
    status: decisionCandidateStatusValidator,
    confidence: decisionCandidateConfidenceValidator,
    title: v.string(),
    summary: v.optional(v.string()),
    rawTextPreview: v.optional(v.string()),
    sourceRef: decisionSourceRefValidator,
    extractedSignals: v.optional(v.array(v.string())),
    suggestedDecisionType: v.optional(v.string()),
    suggestedEntities: v.optional(v.array(v.string())),
    suggestedTags: v.optional(v.array(v.string())),
    confirmedDecisionId: v.optional(v.id("decisions")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_project", ["projectId"]),

  rollbackEvents: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    decisionId: v.optional(v.id("decisions")),
    title: v.string(),
    summary: v.optional(v.string()),
    source: rollbackSourceValidator,
    reason: v.optional(v.string()),
    revertedEventIds: v.optional(v.array(v.id("events"))),
    revertedArtifactIds: v.optional(v.array(v.id("artifacts"))),
    sourceRef: v.optional(v.any()),
    timelineEventId: v.optional(v.id("events")),
    rolledBackAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_decision", ["decisionId"]),

  observabilitySignals: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    incidentId: v.optional(v.id("incidents")),
    source: observabilitySourceValidator,
    signalType: observabilitySignalTypeValidator,
    severity: incidentSeverityValidator,
    title: v.string(),
    summary: v.optional(v.string()),
    service: v.optional(v.string()),
    environment: v.optional(v.string()),
    region: v.optional(v.string()),
    fingerprint: v.optional(v.string()),
    sourceSignalId: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    occurredAt: v.number(),
    metadata: v.optional(v.any()),
    linkedEventIds: v.optional(v.array(v.id("events"))),
    linkedWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
    linkedDecisionIds: v.optional(v.array(v.id("decisions"))),
    linkedRollbackIds: v.optional(v.array(v.id("rollbackEvents"))),
    linkedArtifactIds: v.optional(v.array(v.id("artifacts"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_incident", ["incidentId"])
    .index("by_workspace_type", ["workspaceId", "signalType"])
    .index("by_workspace_severity", ["workspaceId", "severity"])
    .index("by_fingerprint", ["workspaceId", "fingerprint"])
    .index("by_source_signal", ["workspaceId", "source", "sourceSignalId"]),

  incidents: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    workstreamId: v.optional(v.id("workstreams")),
    title: v.string(),
    summary: v.optional(v.string()),
    status: incidentStatusValidator,
    severity: incidentSeverityValidator,
    source: incidentSourceValidator,
    service: v.optional(v.string()),
    environment: v.optional(v.string()),
    startedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    rootCause: v.optional(v.string()),
    mitigation: v.optional(v.string()),
    rollbackSummary: v.optional(v.string()),
    sourceRef: v.optional(incidentSourceRefValidator),
    linkedSignalIds: v.optional(v.array(v.id("observabilitySignals"))),
    linkedEventIds: v.optional(v.array(v.id("events"))),
    linkedWorkstreamIds: v.optional(v.array(v.id("workstreams"))),
    linkedDecisionIds: v.optional(v.array(v.id("decisions"))),
    linkedRollbackIds: v.optional(v.array(v.id("rollbackEvents"))),
    linkedArtifactIds: v.optional(v.array(v.id("artifacts"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_severity", ["workspaceId", "severity"])
    .index("by_source_ref", ["workspaceId", "source", "sourceRef.sourceIncidentId"]),
});
