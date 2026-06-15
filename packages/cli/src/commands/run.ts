import path from "node:path";
import {
  findRepoRoot,
  formatDurationMs,
  loadConfig,
  loadSession,
  redactSensitiveContent,
  truncateCommandOutput,
} from "@sortiri/local";
import {
  getRunCommandArgs,
  mergeCommandOutput,
  runCommandWithCapture,
} from "../lib/commandCapture.js";
import { CLI_ACTOR, IngestClient } from "../ingestClient.js";

function quoteShellArg(arg: string): string {
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(arg)) {
    return arg;
  }
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

function buildShellCommand(args: string[]): string {
  return args.map(quoteShellArg).join(" ");
}

export async function runRun(argv: string[]): Promise<void> {
  const commandArgs = getRunCommandArgs(argv);
  if (commandArgs.length === 0) {
    console.error("Usage: sortiri run -- <command>");
    console.error("Example: sortiri run -- npm run build");
    process.exit(1);
  }

  let config;
  try {
    config = loadConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }

  const repoRoot = findRepoRoot();
  const session = loadSession(repoRoot);
  const command = buildShellCommand(commandArgs);
  const shell = process.env.SHELL ?? "/bin/sh";
  const projectName = config.projectName ?? path.basename(repoRoot);
  const workstreamId = session.currentWorkstreamId ?? undefined;
  const client = new IngestClient(config);
  const startedAt = Date.now();

  await client.recordEvent({
    source: "cli",
    category: "system_event",
    type: "command.started",
    actor: CLI_ACTOR,
    title: `Started command: ${command}`,
    summary: "Sortiri started a local command.",
    workstreamId,
    entity: {
      type: "project",
      name: projectName,
    },
    data: {
      command,
      cwd: repoRoot,
      shell,
      startedAt,
    },
  });

  const result = await runCommandWithCapture(command, repoRoot);
  const mergedOutput = mergeCommandOutput(result.stdout, result.stderr);
  const redacted = redactSensitiveContent(mergedOutput).redacted;
  const { content, truncated } = truncateCommandOutput(redacted);

  const artifact = await client.createArtifact({
    type: "command_output",
    title: `Output for ${command}`,
    summary: `Captured stdout/stderr for ${command}.`,
    content,
    language: "text",
    truncated,
    emitEvent: false,
    workstreamId,
    metadata: {
      command,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      stdoutLength: result.stdout.length,
      stderrLength: result.stderr.length,
    },
  });

  const durationLabel = formatDurationMs(result.durationMs);
  const artifactIds = artifact?.artifactId ? [artifact.artifactId] : undefined;
  const eventData = {
    command,
    cwd: repoRoot,
    shell,
    startedAt: result.startedAt,
    endedAt: result.endedAt,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
  };

  if (result.exitCode === 0) {
    await client.recordEvent({
      source: "cli",
      category: "system_event",
      type: "command.completed",
      actor: CLI_ACTOR,
      title: `Command passed: ${command}`,
      summary: `${command} completed successfully in ${durationLabel}.`,
      workstreamId,
      artifactIds,
      severity: "info",
      data: eventData,
      occurredAt: result.endedAt,
    });
  } else {
    await client.recordEvent({
      source: "cli",
      category: "system_event",
      type: "command.failed",
      actor: CLI_ACTOR,
      title: `Command failed: ${command}`,
      summary: `${command} failed with exit code ${result.exitCode} after ${durationLabel}.`,
      workstreamId,
      artifactIds,
      severity: "error",
      data: eventData,
      occurredAt: result.endedAt,
    });
  }

  process.exit(result.exitCode);
}
