#!/usr/bin/env node
import { Command } from "commander";
import { runContext } from "./commands/context.js";
import { runEvals } from "./commands/evals.js";
import { runRecommendations } from "./commands/recommendations.js";
import { runDev } from "./commands/dev.js";
import { runDoctor } from "./commands/doctor.js";
import { runInit } from "./commands/init.js";
import { runRun } from "./commands/run.js";

async function main(): Promise<void> {
  if (process.argv[2] === "run") {
    await runRun(process.argv);
    return;
  }

  const program = new Command();

  program
    .name("sortiri")
    .description("Sortiri CLI — local project setup and file watcher")
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
    .option("--yes", "Skip prompts and use defaults + flags", false)
    .action(async (options) => {
      await runInit({
        apiUrl: options.apiUrl,
        token: options.token,
        apiKey: options.apiKey,
        workspaceId: options.workspaceId,
        projectId: options.projectId,
        editor: options.editor,
        yes: options.yes,
      });
    });

  program
    .command("doctor")
    .description("Verify local Sortiri setup and record a test event")
    .option("--no-record", "Skip recording cli.doctor_passed test event")
    .action(async (options) => {
      await runDoctor({ record: options.record });
    });

  program
    .command("dev")
    .description("Start the Sortiri file watcher")
    .action(async () => {
      await runDev();
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

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
