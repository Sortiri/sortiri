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
