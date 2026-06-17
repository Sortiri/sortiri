#!/usr/bin/env node
import { Command } from "commander";
import { runContext } from "./commands/context.js";
import { runDecisions, runSlackTestWebhook } from "./commands/decisions.js";
import { runIncidents, runObservabilityTestWebhook } from "./commands/incidents.js";
import { runEvals } from "./commands/evals.js";
import { runRecommendations } from "./commands/recommendations.js";
import { runReliability } from "./commands/reliability.js";
import { runDev } from "./commands/dev.js";
import { runDoctor } from "./commands/doctor.js";
import { runExport } from "./commands/export.js";
import { runInit } from "./commands/init.js";
import { runMcp } from "./commands/mcp.js";
import { runRecord } from "./commands/record.js";
import { runRun } from "./commands/run.js";

async function main(): Promise<void> {
  if (process.argv[2] === "run") {
    await runRun(process.argv);
    return;
  }

  const program = new Command();

  program
    .name("sortiri")
    .description("Sortiri CLI — open-source timeline layer for AI-native companies")
    .version("0.1.0");

  program
    .command("init")
    .description("Initialize Sortiri in the current repo")
    .option("--api-url <url>", "Sortiri API URL")
    .option("--token <token>", "One-time setup token from Sources")
    .option("--api-key <key>", "Sortiri API key (advanced manual setup)")
    .option("--workspace-id <id>", "Workspace external ID (advanced manual setup)")
    .option("--project-id <id>", "Optional Convex project ID")
    .option("--editor <editor>", "Editor name", "cursor")
    .option("--yes", "Initialize local mode without prompts", false)
    .option("--local", "Force local mode", false)
    .option("--force-rules", "Overwrite Cursor Sortiri rule", false)
    .action(async (options) => {
      await runInit({
        apiUrl: options.apiUrl,
        token: options.token,
        apiKey: options.apiKey,
        workspaceId: options.workspaceId,
        projectId: options.projectId,
        editor: options.editor,
        yes: options.yes,
        local: options.local,
        forceRules: options.forceRules,
      });
    });

  program
    .command("doctor")
    .description("Verify local Sortiri setup")
    .option("--no-record", "Skip recording doctor validation event")
    .action(async (options) => {
      await runDoctor({ record: options.record });
    });

  program
    .command("dev")
    .description("Start local timeline viewer (or cloud file watcher with --watch)")
    .option("--smoke", "Smoke-check viewer bind and exit", false)
    .option("--watch", "Start cloud file watcher in cloud mode", false)
    .option("--port <port>", "Viewer port", (value) => Number(value))
    .option("--host <host>", "Viewer host")
    .action(async (options) => {
      await runDev({
        smoke: options.smoke,
        watch: options.watch,
        port: options.port,
        host: options.host,
      });
    });

  program
    .command("record")
    .description("Record a local timeline event")
    .requiredOption("--type <type>", "Event type (e.g. agent.action)")
    .requiredOption("--title <title>", "Event title")
    .option("--summary <text>", "Event summary")
    .option("--workstream <id>", "Workstream ID")
    .option("--source <source>", "Event source")
    .action(async (options) => {
      await runRecord({
        type: options.type,
        title: options.title,
        summary: options.summary,
        workstream: options.workstream,
        source: options.source,
      });
    });

  program
    .command("export")
    .description("Export local timeline JSONL")
    .option("--out <path>", "Write export to file instead of stdout")
    .action(async (options) => {
      await runExport({ out: options.out });
    });

  program
    .command("mcp")
    .description("Start Sortiri MCP server (stdio)")
    .action(async () => {
      await runMcp();
    });

  program
    .command("run")
    .description("Run a command and capture output to the timeline")
    .action(async () => {
      await runRun(process.argv);
    });

  program
    .command("context")
    .description("Create or fetch a Sortiri context pack for agent work")
    .option("--goal <goal>", "What you are trying to accomplish")
    .option("--title <title>", "Optional pack title")
    .option("--file <path>", "Relevant file path (repeatable)", (value, previous: string[] = []) => [
      ...previous,
      value,
    ])
    .option("--project <id>", "Scope to project ID")
    .option("--workstream <id>", "Scope to workstream ID")
    .option("--entity <id>", "Scope to entity ID")
    .option("--time-window-days <days>", "Lookback window in days", (value) => Number(value))
    .option("--pack-id <id>", "Fetch an existing context pack instead of creating one")
    .action(async (options) => {
      await runContext({
        goal: options.goal,
        title: options.title,
        file: options.file,
        project: options.project,
        workstream: options.workstream,
        entity: options.entity,
        timeWindowDays: options.timeWindowDays,
        packId: options.packId,
      });
    });

  const recommendations = program
    .command("recommendations")
    .description("List, generate, get, or convert Sortiri recommendations");

  recommendations
    .command("list")
    .description("List open recommendations")
    .option("--limit <n>", "Max recommendations", (value) => Number(value))
    .action(async (options) => {
      await runRecommendations({ subcommand: "list", limit: options.limit });
    });

  recommendations
    .command("generate")
    .description("Generate recommendations for the workspace")
    .action(async () => {
      await runRecommendations({ subcommand: "generate" });
    });

  recommendations
    .command("get <id>")
    .description("Get a recommendation by ID")
    .action(async (id: string) => {
      await runRecommendations({ subcommand: "get", id });
    });

  recommendations
    .command("convert <id>")
    .description("Convert a recommendation to a workstream")
    .action(async (id: string) => {
      await runRecommendations({ subcommand: "convert", id });
    });

  const decisions = program.command("decisions").description("Record and inspect company decisions");

  decisions
    .command("record")
    .description("Record a manual decision")
    .requiredOption("--title <title>", "Decision title")
    .option("--rationale <text>", "Why this decision was made")
    .option("--workstream <id>", "Link to workstream ID")
    .action(async (options) => {
      await runDecisions({
        subcommand: "record",
        title: options.title,
        rationale: options.rationale,
        workstreamId: options.workstream,
      });
    });

  decisions
    .command("list")
    .description("List decisions")
    .option("--limit <n>", "Max decisions", (value) => Number(value))
    .action(async (options) => {
      await runDecisions({ subcommand: "list", limit: options.limit });
    });

  decisions
    .command("get <id>")
    .description("Get a decision by ID")
    .action(async (id: string) => {
      await runDecisions({ subcommand: "get", id });
    });

  decisions
    .command("link")
    .description("Link a decision to a workstream")
    .requiredOption("--decision <id>", "Decision ID")
    .requiredOption("--workstream <id>", "Workstream ID")
    .action(async (options) => {
      await runDecisions({
        subcommand: "link",
        decisionId: options.decision,
        workstreamId: options.workstream,
      });
    });

  decisions
    .command("rollback")
    .description("Record a rollback for a decision")
    .requiredOption("--title <title>", "Rollback title")
    .option("--decision <id>", "Decision ID")
    .action(async (options) => {
      await runDecisions({
        subcommand: "rollback",
        title: options.title,
        decisionId: options.decision,
      });
    });

  const slack = program.command("slack").description("Slack integration helpers");

  slack
    .command("test-webhook")
    .description("Send a signed Slack test event to Convex HTTP")
    .option("--secret <secret>", "Slack signing secret (or SORTIRI_SLACK_SIGNING_SECRET)")
    .action(async (options) => {
      await runSlackTestWebhook(options.secret);
    });

  const incidents = program
    .command("incidents")
    .description("Record and manage production incidents");

  incidents
    .command("record")
    .description("Record a manual incident")
    .requiredOption("--title <title>", "Incident title")
    .option("--summary <text>", "Incident summary")
    .option("--severity <level>", "Severity: info, warning, error, critical", "error")
    .option("--workstream <id>", "Link to workstream ID")
    .option("--service <name>", "Affected service")
    .option("--environment <name>", "Environment (e.g. production)")
    .action(async (options) => {
      await runIncidents({
        subcommand: "record",
        title: options.title,
        summary: options.summary,
        severity: options.severity,
        workstreamId: options.workstream,
        service: options.service,
        environment: options.environment,
      });
    });

  incidents
    .command("list")
    .description("List incidents")
    .option("--limit <n>", "Max incidents", (value) => Number(value))
    .option("--status <status>", "Filter by status")
    .option("--severity <level>", "Filter by severity")
    .action(async (options) => {
      await runIncidents({
        subcommand: "list",
        limit: options.limit,
        status: options.status,
        severity: options.severity,
      });
    });

  incidents
    .command("get <id>")
    .description("Get an incident by ID")
    .action(async (id: string) => {
      await runIncidents({ subcommand: "get", id });
    });

  incidents
    .command("resolve <id>")
    .description("Resolve an incident")
    .option("--root-cause <text>", "Root cause summary")
    .option("--mitigation <text>", "Mitigation applied")
    .option("--rollback-summary <text>", "Rollback summary if applicable")
    .action(async (id: string, options) => {
      await runIncidents({
        subcommand: "resolve",
        id,
        rootCause: options.rootCause,
        mitigation: options.mitigation,
        rollbackSummary: options.rollbackSummary,
      });
    });

  incidents
    .command("rollback <id>")
    .description("Record a rollback for an incident")
    .requiredOption("--title <title>", "Rollback title")
    .option("--summary <text>", "Rollback summary")
    .option("--reason <text>", "Why rolling back")
    .action(async (id: string, options) => {
      await runIncidents({
        subcommand: "rollback",
        id,
        title: options.title,
        summary: options.summary,
        reason: options.reason,
      });
    });

  const observability = program
    .command("observability")
    .description("Observability integration helpers");

  observability
    .command("test-webhook")
    .description("Send a signed observability test event to Convex HTTP")
    .option(
      "--secret <secret>",
      "Observability signing secret (or SORTIRI_OBSERVABILITY_SIGNING_SECRET)",
    )
    .action(async (options) => {
      await runObservabilityTestWebhook(options.secret);
    });

  const evals = program.command("evals").description("List, generate, run, or inspect private eval suites");

  evals
    .command("list")
    .description("List active eval suites")
    .option("--limit <n>", "Max suites", (value) => Number(value))
    .action(async (options) => {
      await runEvals({ subcommand: "list", limit: options.limit });
    });

  evals
    .command("generate")
    .description("Generate an eval suite from a source entity")
    .option("--from-playbook <id>", "Playbook ID")
    .option("--from-lesson <id>", "Lesson ID")
    .option("--from-recommendation <id>", "Recommendation ID")
    .option("--from-context-pack <id>", "Context pack ID")
    .action(async (options) => {
      const source = options.fromPlaybook
        ? "playbook"
        : options.fromLesson
          ? "lesson"
          : options.fromRecommendation
            ? "recommendation"
            : options.fromContextPack
              ? "context_pack"
              : undefined;
      const entityId =
        options.fromPlaybook ??
        options.fromLesson ??
        options.fromRecommendation ??
        options.fromContextPack;
      await runEvals({ subcommand: "generate", source, entityId });
    });

  evals
    .command("run <suiteId>")
    .description("Run an eval suite locally and record results")
    .action(async (suiteId: string) => {
      await runEvals({ subcommand: "run", id: suiteId });
    });

  evals
    .command("runs <suiteId>")
    .description("List recent runs for a suite")
    .action(async (suiteId: string) => {
      await runEvals({ subcommand: "runs", id: suiteId });
    });

  evals
    .command("get-run <runId>")
    .description("Get an eval run with results")
    .action(async (runId: string) => {
      await runEvals({ subcommand: "get-run", id: runId });
    });

  const remediation = evals
    .command("remediation")
    .description("Manage eval failure remediations");

  remediation
    .command("list")
    .description("List open eval remediations")
    .option("--limit <n>", "Max remediations", (value) => Number(value))
    .action(async (options) => {
      await runEvals({ subcommand: "remediation-list", limit: options.limit });
    });

  remediation
    .command("generate")
    .description("Generate remediation recommendations from a failed eval run")
    .requiredOption("--run <evalRunId>", "Failed eval run ID")
    .action(async (options) => {
      await runEvals({ subcommand: "remediation-generate", run: options.run });
    });

  remediation
    .command("convert <recommendationId>")
    .description("Convert a remediation recommendation to a workstream")
    .action(async (recommendationId: string) => {
      await runEvals({ subcommand: "remediation-convert", id: recommendationId });
    });

  remediation
    .command("rerun <recommendationId>")
    .description("Re-run eval suite after remediation")
    .action(async (recommendationId: string) => {
      await runEvals({ subcommand: "remediation-rerun", id: recommendationId });
    });

  const reliability = program
    .command("reliability")
    .description("Inspect ingest deliveries, dead letters, journal, and replay");

  reliability
    .command("deliveries")
    .description("List ingest deliveries")
    .option("--status <status>", "Filter by delivery status")
    .option("--source <source>", "Filter by source")
    .option("--limit <n>", "Max deliveries", (value) => Number(value))
    .action(async (options) => {
      await runReliability({
        subcommand: "deliveries",
        status: options.status,
        source: options.source,
        limit: options.limit,
      });
    });

  reliability
    .command("dead-letters")
    .description("List ingest dead letters")
    .option("--status <status>", "Filter by dead letter status")
    .option("--limit <n>", "Max dead letters", (value) => Number(value))
    .action(async (options) => {
      await runReliability({
        subcommand: "dead-letters",
        status: options.status,
        limit: options.limit,
      });
    });

  reliability
    .command("replay")
    .description("Replay a delivery or dead letter from journal")
    .option("--delivery <id>", "Delivery ID to replay")
    .option("--dead-letter <id>", "Dead letter ID to replay")
    .option("--payload <json>", "Optional payload override (JSON)")
    .action(async (options) => {
      await runReliability({
        subcommand: "replay",
        deliveryId: options.delivery,
        deadLetterId: options.deadLetter,
        payload: options.payload,
      });
    });

  const journal = reliability.command("journal").description("Durable ingest journal");

  journal
    .command("list")
    .description("List journaled envelope refs")
    .option("--source <source>", "Filter by source")
    .option("--limit <n>", "Max entries", (value) => Number(value))
    .action(async (options) => {
      await runReliability({
        subcommand: "journal-list",
        source: options.source,
        limit: options.limit,
      });
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
