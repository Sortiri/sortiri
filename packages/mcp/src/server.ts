#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { asCloudConfig, isLocalMode, loadConfig, clearSessionSafe, saveSessionSafe } from "@sortiri/local";
import { SortiriLocalClient } from "./localClient.js";
import { registerLocalMcpTools } from "./localServer.js";
import { SortiriApiClient } from "./client.js";
import {
  confirmDecisionCandidateSchema,
  createIncidentRollbackSchema,
  createRollbackSchema,
  dismissDecisionCandidateSchema,
  getDecisionSchema,
  getIncidentSchema,
  linkDecisionToWorkstreamSchema,
  linkIncidentToDecisionSchema,
  linkIncidentToWorkstreamSchema,
  listDecisionCandidatesSchema,
  listDecisionsSchema,
  listIncidentsSchema,
  listObservabilitySignalsSchema,
  recordDecisionSchema,
  recordIncidentSchema,
  resolveIncidentSchema,
  attachArtifactSchema,
  convertRecommendationSchema,
  createContextPackSchema,
  finishWorkstreamSchema,
  generateContextFromRecommendationSchema,
  generateEvalSuiteSchema,
  generateRemediationFromEvalSchema,
  generateRecommendationsSchema,
  getContextPackSchema,
  getEntityMemorySchema,
  getEvalRunSchema,
  getEvalSuiteSchema,
  getEvalRemediationSchema,
  getIngestDeliverySchema,
  getKnownFailuresSchema,
  getProjectMemorySchema,
  getRecommendationSchema,
  getRecommendedPlaybookSchema,
  getSourceHealthSchema,
  getValidationRequirementsSchema,
  listDeadLettersSchema,
  listEvalSuitesSchema,
  listEvalRemediationsSchema,
  listIngestDeliveriesSchema,
  listRecommendationsSchema,
  replayIngestDeliverySchema,
  recommendEvalsForWorkstreamSchema,
  convertRemediationToWorkstreamSchema,
  rerunEvalForRemediationSchema,
  recordEventSchema,
  runEvalSuiteSchema,
  startWorkstreamSchema,
} from "./tools/index.js";

async function main() {
  const config = loadConfig();
  const server = new McpServer({
    name: "sortiri",
    version: "0.1.0",
  });

  if (isLocalMode(config)) {
    const localClient = new SortiriLocalClient();
    registerLocalMcpTools(server, localClient);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return;
  }

  const client = new SortiriApiClient(asCloudConfig(config));

  server.tool(
    "start_workstream",
    "Start a new Sortiri workstream before beginning a meaningful task. Use this when the user asks you to build, change, investigate, debug, research, or design something.",
    startWorkstreamSchema.shape,
    async (args) => {
      const input = startWorkstreamSchema.parse(args);
      const result = await client.startWorkstream(input);
      saveSessionSafe({
        currentWorkstreamId: result.workstreamId,
        currentWorkstreamTitle: input.title,
        startedAt: Date.now(),
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ workstreamId: result.workstreamId }) }],
      };
    },
  );

  server.tool(
    "record_event",
    "Record a Sortiri timeline event. Use this whenever you create a plan, make a decision, change code, create an artifact, complete a step, encounter an error, or change direction.",
    recordEventSchema.shape,
    async (args) => {
      const input = recordEventSchema.parse(args);
      const result = await client.recordEvent(input);
      return {
        content: [{ type: "text", text: JSON.stringify({ eventId: result.eventId }) }],
      };
    },
  );

  server.tool(
    "attach_artifact",
    "Attach a file, diff, URL, document, log, or command output to the current Sortiri workstream.",
    attachArtifactSchema.shape,
    async (args) => {
      const input = attachArtifactSchema.parse(args);
      const result = await client.attachArtifact(input);
      return {
        content: [{ type: "text", text: JSON.stringify({ artifactId: result.artifactId }) }],
      };
    },
  );

  server.tool(
    "finish_workstream",
    "Finish the current Sortiri workstream after the task is completed, blocked, or handed back to the user.",
    finishWorkstreamSchema.shape,
    async (args) => {
      const input = finishWorkstreamSchema.parse(args);
      const result = await client.finishWorkstream(input);
      clearSessionSafe();
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    },
  );

  server.tool(
    "sortiri_create_context_pack",
    "Create and generate a Sortiri context pack before meaningful product, engineering, integration, audit, or permissions work. Returns formatted context text plus pack ID.",
    createContextPackSchema.shape,
    async (args) => {
      const input = createContextPackSchema.parse(args);
      const result = await client.createContextPack(input);
      return {
        content: [
          {
            type: "text",
            text: `${result.text}\n\n---\nContext pack ID: ${result.contextPackId}`,
          },
        ],
      };
    },
  );

  server.tool(
    "sortiri_get_context_pack",
    "Fetch a previously generated Sortiri context pack by ID. Marks the pack as used by the agent.",
    getContextPackSchema.shape,
    async (args) => {
      const input = getContextPackSchema.parse(args);
      const result = await client.getContextPack(input.contextPackId);
      return {
        content: [{ type: "text", text: result.text }],
      };
    },
  );

  server.tool(
    "sortiri_get_project_memory",
    "Get ephemeral project-scoped memory: recent events, recommended playbook, known failures, and validation requirements.",
    getProjectMemorySchema.shape,
    async (args) => {
      const input = getProjectMemorySchema.parse(args);
      const result = await client.getProjectMemory(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_get_entity_memory",
    "Get entity-scoped memory for a key or ID.",
    getEntityMemorySchema.shape,
    async (args) => {
      const input = getEntityMemorySchema.parse(args);
      const result = await client.getEntityMemory(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_get_known_failures",
    "List known failure patterns for a goal, files, or project scope.",
    getKnownFailuresSchema.shape,
    async (args) => {
      const input = getKnownFailuresSchema.parse(args);
      const result = await client.getKnownFailures(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_get_validation_requirements",
    "Get rule-based validation requirements for a goal (Stripe, PostHog, GitHub, audit, permissions, UI).",
    getValidationRequirementsSchema.shape,
    async (args) => {
      const input = getValidationRequirementsSchema.parse(args);
      const result = await client.getValidationRequirements(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_get_recommended_playbook",
    "Get the best-matching active playbook for a goal.",
    getRecommendedPlaybookSchema.shape,
    async (args) => {
      const input = getRecommendedPlaybookSchema.parse(args);
      const result = await client.getRecommendedPlaybook(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_list_recommendations",
    "List open evidence-backed recommendations in the autonomy queue.",
    listRecommendationsSchema.shape,
    async (args) => {
      const input = listRecommendationsSchema.parse(args);
      const result = await client.listRecommendations(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_get_recommendation",
    "Get a single recommendation by ID with evidence and suggested actions.",
    getRecommendationSchema.shape,
    async (args) => {
      const input = getRecommendationSchema.parse(args);
      const result = await client.getRecommendation(input.recommendationId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_generate_recommendations",
    "Generate new recommendations from insights, impact, lessons, failures, and source health.",
    generateRecommendationsSchema.shape,
    async () => {
      const result = await client.generateRecommendations();
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_convert_recommendation_to_workstream",
    "Convert a recommendation into an approved workstream with context pack.",
    convertRecommendationSchema.shape,
    async (args) => {
      const input = convertRecommendationSchema.parse(args);
      const result = await client.convertRecommendationToWorkstream(input.recommendationId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_generate_context_from_recommendation",
    "Generate a context pack from a recommendation without converting to a workstream.",
    generateContextFromRecommendationSchema.shape,
    async (args) => {
      const input = generateContextFromRecommendationSchema.parse(args);
      const result = await client.generateContextFromRecommendation(input.recommendationId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_generate_eval_suite",
    "Generate a private eval suite from a playbook, lesson, recommendation, context pack, or known failure.",
    generateEvalSuiteSchema.shape,
    async (args) => {
      const input = generateEvalSuiteSchema.parse(args);
      const result = await client.generateEvalSuite(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_list_eval_suites",
    "List active private eval suites for the workspace.",
    listEvalSuitesSchema.shape,
    async (args) => {
      const input = listEvalSuitesSchema.parse(args);
      const result = await client.listEvalSuites(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_get_eval_suite",
    "Get an eval suite with cases and recent runs.",
    getEvalSuiteSchema.shape,
    async (args) => {
      const input = getEvalSuiteSchema.parse(args);
      const result = await client.getEvalSuite(input.evalSuiteId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_run_eval_suite",
    "Queue an eval run for a suite. Returns runId and cases; execute locally with scripts/run-eval-suite.ts.",
    runEvalSuiteSchema.shape,
    async (args) => {
      const input = runEvalSuiteSchema.parse(args);
      const result = await client.runEvalSuite(input.evalSuiteId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_get_eval_run",
    "Get an eval run with filtered results.",
    getEvalRunSchema.shape,
    async (args) => {
      const input = getEvalRunSchema.parse(args);
      const result = await client.getEvalRun(input.evalRunId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_recommend_evals_for_workstream",
    "Suggest eval suites linked to a workstream's project, recommendation, or context.",
    recommendEvalsForWorkstreamSchema.shape,
    async (args) => {
      const input = recommendEvalsForWorkstreamSchema.parse(args);
      const result = await client.recommendEvalsForWorkstream(input.workstreamId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_generate_remediation_from_eval",
    "Generate remediation recommendations from a failed eval run.",
    generateRemediationFromEvalSchema.shape,
    async (args) => {
      const input = generateRemediationFromEvalSchema.parse(args);
      const result = await client.generateRemediationFromEval(input.evalRunId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_list_eval_remediations",
    "List open eval failure remediations for the workspace.",
    listEvalRemediationsSchema.shape,
    async (args) => {
      const input = listEvalRemediationsSchema.parse(args);
      const result = await client.listEvalRemediations(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_get_eval_remediation",
    "Get a remediation recommendation with eval failure context.",
    getEvalRemediationSchema.shape,
    async (args) => {
      const input = getEvalRemediationSchema.parse(args);
      const result = await client.getEvalRemediation(input.recommendationId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_convert_remediation_to_workstream",
    "Convert an eval remediation recommendation into a workstream with context pack.",
    convertRemediationToWorkstreamSchema.shape,
    async (args) => {
      const input = convertRemediationToWorkstreamSchema.parse(args);
      const result = await client.convertRemediationToWorkstream(input.recommendationId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_rerun_eval_for_remediation",
    "Queue a remediation eval re-run linked to a recommendation.",
    rerunEvalForRemediationSchema.shape,
    async (args) => {
      const input = rerunEvalForRemediationSchema.parse(args);
      const result = await client.rerunEvalForRemediation(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_list_ingest_deliveries",
    "List ingest deliveries with optional status and source filters.",
    listIngestDeliveriesSchema.shape,
    async (args) => {
      const input = listIngestDeliveriesSchema.parse(args);
      const result = await client.listIngestDeliveries(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_get_ingest_delivery",
    "Get a single ingest delivery by ID.",
    getIngestDeliverySchema.shape,
    async (args) => {
      const input = getIngestDeliverySchema.parse(args);
      const result = await client.getIngestDelivery(input.deliveryId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_list_dead_letters",
    "List ingest dead letters for failed deliveries.",
    listDeadLettersSchema.shape,
    async (args) => {
      const input = listDeadLettersSchema.parse(args);
      const result = await client.listDeadLetters(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_replay_ingest_delivery",
    "Replay an ingest delivery or dead letter from journal or payload.",
    replayIngestDeliverySchema.shape,
    async (args) => {
      const input = replayIngestDeliverySchema.parse(args);
      const result = await client.replayIngestDelivery(input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_get_source_health",
    "Get per-source ingest delivery health summary (last 24h).",
    getSourceHealthSchema.shape,
    async () => {
      const result = await client.getSourceHealth();
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "sortiri_record_decision",
    "Record a company decision with rationale and rollback plan.",
    recordDecisionSchema.shape,
    async (args) => {
      const input = recordDecisionSchema.parse(args);
      const result = await client.recordDecision(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_list_decisions",
    "List company decisions in the workspace.",
    listDecisionsSchema.shape,
    async (args) => {
      const input = listDecisionsSchema.parse(args);
      const result = await client.listDecisions(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_get_decision",
    "Get a decision by ID.",
    getDecisionSchema.shape,
    async (args) => {
      const input = getDecisionSchema.parse(args);
      const result = await client.getDecision(input.decisionId);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_link_decision_to_workstream",
    "Link a decision to a workstream.",
    linkDecisionToWorkstreamSchema.shape,
    async (args) => {
      const input = linkDecisionToWorkstreamSchema.parse(args);
      const result = await client.linkDecisionToWorkstream(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_create_rollback",
    "Record a rollback linked to a decision.",
    createRollbackSchema.shape,
    async (args) => {
      const input = createRollbackSchema.parse(args);
      const result = await client.createRollback(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_list_decision_candidates",
    "List pending decision candidates from Slack or system.",
    listDecisionCandidatesSchema.shape,
    async (args) => {
      const input = listDecisionCandidatesSchema.parse(args);
      const result = await client.listDecisionCandidates(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_confirm_decision_candidate",
    "Confirm a decision candidate into a recorded decision.",
    confirmDecisionCandidateSchema.shape,
    async (args) => {
      const input = confirmDecisionCandidateSchema.parse(args);
      const result = await client.confirmDecisionCandidate(input.candidateId);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_dismiss_decision_candidate",
    "Dismiss a decision candidate.",
    dismissDecisionCandidateSchema.shape,
    async (args) => {
      const input = dismissDecisionCandidateSchema.parse(args);
      const result = await client.dismissDecisionCandidate(input.candidateId);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_record_incident",
    "Record a production incident (deploy failure, outage, or error).",
    recordIncidentSchema.shape,
    async (args) => {
      const input = recordIncidentSchema.parse(args);
      const result = await client.recordIncident(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_list_incidents",
    "List incidents in the workspace.",
    listIncidentsSchema.shape,
    async (args) => {
      const input = listIncidentsSchema.parse(args);
      const result = await client.listIncidents(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_get_incident",
    "Get an incident by ID.",
    getIncidentSchema.shape,
    async (args) => {
      const input = getIncidentSchema.parse(args);
      const result = await client.getIncident(input.incidentId);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_resolve_incident",
    "Resolve an incident with root cause and mitigation.",
    resolveIncidentSchema.shape,
    async (args) => {
      const input = resolveIncidentSchema.parse(args);
      const result = await client.resolveIncident(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_create_incident_rollback",
    "Record a rollback linked to an incident.",
    createIncidentRollbackSchema.shape,
    async (args) => {
      const input = createIncidentRollbackSchema.parse(args);
      const result = await client.createIncidentRollback(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_link_incident_to_workstream",
    "Link an incident to a remediation workstream.",
    linkIncidentToWorkstreamSchema.shape,
    async (args) => {
      const input = linkIncidentToWorkstreamSchema.parse(args);
      const result = await client.linkIncidentToWorkstream(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_link_incident_to_decision",
    "Link an incident to a related decision.",
    linkIncidentToDecisionSchema.shape,
    async (args) => {
      const input = linkIncidentToDecisionSchema.parse(args);
      const result = await client.linkIncidentToDecision(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "sortiri_list_observability_signals",
    "List observability signals (deploy failures, alerts, rollbacks).",
    listObservabilitySignalsSchema.shape,
    async (args) => {
      const input = listObservabilitySignalsSchema.parse(args);
      const result = await client.listObservabilitySignals(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
