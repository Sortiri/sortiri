#!/usr/bin/env node
import { Command } from "commander";
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

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
