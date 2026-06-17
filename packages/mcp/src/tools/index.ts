import { z } from "zod";

export const startWorkstreamSchema = z.object({
  title: z.string().describe("Short title for the task or investigation"),
  summary: z.string().optional().describe("Optional context for why this workstream started"),
});

export const recordEventSchema = z.object({
  workstreamId: z.string().optional().describe("Current workstream ID if one is active"),
  category: z
    .enum(["agent_action", "code_change", "company_decision", "system_event"])
    .describe("Event category"),
  type: z
    .string()
    .describe(
      "Event type such as agent.plan_created, file.changed, build.passed, decision.made",
    ),
  title: z.string().describe("Short event title"),
  summary: z.string().optional().describe("Why this event mattered"),
  entity: z
    .object({
      type: z.string().optional(),
      id: z.string().optional(),
      name: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  data: z.record(z.unknown()).optional(),
  severity: z.enum(["info", "warning", "error", "critical"]).optional(),
  tags: z.array(z.string()).optional(),
});

export const attachArtifactSchema = z.object({
  workstreamId: z.string().optional().describe("Current workstream ID if one is active"),
  type: z.enum([
    "diff",
    "file",
    "url",
    "screenshot",
    "document",
    "log",
    "command_output",
    "other",
  ]),
  title: z.string(),
  summary: z.string().optional(),
  url: z.string().optional(),
  content: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  filePath: z.string().optional(),
  language: z.string().optional(),
  truncated: z.boolean().optional(),
});

export const finishWorkstreamSchema = z.object({
  workstreamId: z.string(),
  outcome: z.string().optional(),
  summary: z.string().optional(),
});

export const createContextPackSchema = z.object({
  goal: z.string().describe("What the agent is trying to accomplish"),
  title: z.string().optional().describe("Optional short title for the context pack"),
  projectId: z.string().optional(),
  workstreamId: z.string().optional(),
  entityId: z.string().optional(),
  files: z.array(z.string()).optional().describe("Relevant file paths"),
  timeWindowDays: z.number().optional().describe("Lookback window in days (default 30)"),
});

export const getContextPackSchema = z.object({
  contextPackId: z.string().describe("Context pack ID from create_context_pack"),
});

export const getProjectMemorySchema = z.object({
  query: z.string().optional().describe("Optional focus query"),
  projectId: z.string().optional(),
  timeWindowDays: z.number().optional(),
});

export const getEntityMemorySchema = z.object({
  entityKeyOrId: z.string().describe("Entity key or ID to scope memory"),
  timeWindowDays: z.number().optional(),
});

export const getKnownFailuresSchema = z.object({
  goal: z.string().optional(),
  files: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  timeWindowDays: z.number().optional(),
});

export const getValidationRequirementsSchema = z.object({
  goal: z.string().describe("What you are building or changing"),
  files: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
});

export const getRecommendedPlaybookSchema = z.object({
  goal: z.string().describe("Task or investigation goal"),
  projectId: z.string().optional(),
});

export const listRecommendationsSchema = z.object({
  limit: z.number().optional().describe("Max open recommendations to return"),
});

export const getRecommendationSchema = z.object({
  recommendationId: z.string().describe("Recommendation ID"),
});

export const generateRecommendationsSchema = z.object({});

export const convertRecommendationSchema = z.object({
  recommendationId: z.string().describe("Recommendation ID to convert to workstream"),
});

export const generateContextFromRecommendationSchema = z.object({
  recommendationId: z.string().describe("Recommendation ID to generate context pack from"),
});

export const generateEvalSuiteSchema = z.object({
  source: z
    .enum(["playbook", "lesson", "recommendation", "context_pack", "known_failure"])
    .describe("Source entity type"),
  entityId: z.string().describe("Source entity ID"),
});

export const listEvalSuitesSchema = z.object({
  limit: z.number().optional().describe("Max eval suites to return"),
});

export const getEvalSuiteSchema = z.object({
  evalSuiteId: z.string().describe("Eval suite ID"),
});

export const runEvalSuiteSchema = z.object({
  evalSuiteId: z.string().describe("Eval suite ID to queue a run for"),
});

export const getEvalRunSchema = z.object({
  evalRunId: z.string().describe("Eval run ID"),
});

export const recommendEvalsForWorkstreamSchema = z.object({
  workstreamId: z.string().describe("Workstream ID to recommend eval suites for"),
});

export const generateRemediationFromEvalSchema = z.object({
  evalRunId: z.string().describe("Failed eval run ID"),
});

export const listEvalRemediationsSchema = z.object({
  limit: z.number().optional().describe("Max remediations to return"),
});

export const getEvalRemediationSchema = z.object({
  recommendationId: z.string().describe("Remediation recommendation ID"),
});

export const convertRemediationToWorkstreamSchema = z.object({
  recommendationId: z.string().describe("Remediation recommendation ID to convert"),
});

export const rerunEvalForRemediationSchema = z.object({
  recommendationId: z.string().describe("Remediation recommendation ID"),
  evalSuiteId: z.string().optional().describe("Eval suite ID (resolved from recommendation if omitted)"),
});

export const listIngestDeliveriesSchema = z.object({
  status: z.string().optional().describe("Filter by delivery status"),
  source: z.string().optional().describe("Filter by source"),
  limit: z.number().optional().describe("Max deliveries to return"),
});

export const getIngestDeliverySchema = z.object({
  deliveryId: z.string().describe("Ingest delivery ID"),
});

export const listDeadLettersSchema = z.object({
  status: z.string().optional().describe("Filter by dead letter status"),
  limit: z.number().optional().describe("Max dead letters to return"),
});

export const replayIngestDeliverySchema = z.object({
  deliveryId: z.string().optional().describe("Delivery ID to replay"),
  deadLetterId: z.string().optional().describe("Dead letter ID to replay"),
  payload: z.unknown().optional().describe("Optional payload override"),
});

export const getSourceHealthSchema = z.object({});

export const recordDecisionSchema = z.object({
  title: z.string().describe("Decision title"),
  summary: z.string().optional().describe("Short summary"),
  decisionType: z
    .enum([
      "product",
      "engineering",
      "design",
      "pricing",
      "go_to_market",
      "security",
      "audit",
      "ops",
      "model",
      "other",
    ])
    .optional()
    .describe("Decision type"),
  rationale: z.string().optional().describe("Why this decision was made"),
  expectedOutcome: z.string().optional().describe("Expected outcome"),
  rollbackPlan: z.string().optional().describe("Rollback plan if wrong"),
  workstreamId: z.string().optional().describe("Linked workstream ID"),
});

export const listDecisionsSchema = z.object({
  limit: z.number().optional().describe("Max decisions to return"),
});

export const getDecisionSchema = z.object({
  decisionId: z.string().describe("Decision ID"),
});

export const linkDecisionToWorkstreamSchema = z.object({
  decisionId: z.string().describe("Decision ID"),
  workstreamId: z.string().describe("Workstream ID to link"),
});

export const createRollbackSchema = z.object({
  decisionId: z.string().optional().describe("Decision being rolled back"),
  title: z.string().describe("Rollback title"),
  summary: z.string().optional().describe("Rollback summary"),
  reason: z.string().optional().describe("Why rolling back"),
});

export const listDecisionCandidatesSchema = z.object({
  limit: z.number().optional().describe("Max candidates to return"),
});

export const confirmDecisionCandidateSchema = z.object({
  candidateId: z.string().describe("Decision candidate ID"),
});

export const dismissDecisionCandidateSchema = z.object({
  candidateId: z.string().describe("Decision candidate ID"),
});

export const recordIncidentSchema = z.object({
  title: z.string().describe("Incident title"),
  summary: z.string().optional().describe("Incident summary"),
  severity: z
    .enum(["info", "warning", "error", "critical"])
    .optional()
    .describe("Incident severity"),
  workstreamId: z.string().optional().describe("Linked workstream ID"),
  service: z.string().optional().describe("Affected service"),
  environment: z.string().optional().describe("Environment (e.g. production)"),
});

export const listIncidentsSchema = z.object({
  status: z
    .enum(["open", "investigating", "mitigated", "resolved", "rolled_back", "archived"])
    .optional()
    .describe("Filter by status"),
  severity: z
    .enum(["info", "warning", "error", "critical"])
    .optional()
    .describe("Filter by severity"),
  limit: z.number().optional().describe("Max incidents to return"),
});

export const getIncidentSchema = z.object({
  incidentId: z.string().describe("Incident ID"),
});

export const resolveIncidentSchema = z.object({
  incidentId: z.string().describe("Incident ID"),
  rootCause: z.string().optional().describe("Root cause summary"),
  mitigation: z.string().optional().describe("Mitigation applied"),
  rollbackSummary: z.string().optional().describe("Rollback summary if applicable"),
});

export const createIncidentRollbackSchema = z.object({
  incidentId: z.string().describe("Incident ID"),
  title: z.string().describe("Rollback title"),
  summary: z.string().optional().describe("Rollback summary"),
  reason: z.string().optional().describe("Why rolling back"),
});

export const linkIncidentToWorkstreamSchema = z.object({
  incidentId: z.string().describe("Incident ID"),
  workstreamId: z.string().describe("Workstream ID to link"),
});

export const linkIncidentToDecisionSchema = z.object({
  incidentId: z.string().describe("Incident ID"),
  decisionId: z.string().describe("Decision ID to link"),
});

export const listObservabilitySignalsSchema = z.object({
  incidentId: z.string().optional().describe("Filter signals linked to incident"),
  severity: z
    .enum(["info", "warning", "error", "critical"])
    .optional()
    .describe("Filter by severity"),
  limit: z.number().optional().describe("Max signals to return"),
});
