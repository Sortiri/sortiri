import type { TimelineEvent } from "@/types/events";

export function formatDurationMs(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    const rounded = seconds >= 10 ? Math.round(seconds) : Math.round(seconds * 10) / 10;
    return `${rounded}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export type CommandMeta = {
  exitCode?: number;
  durationMs?: number;
  durationLabel?: string;
  command?: string;
};

export function getCommandMeta(event: TimelineEvent): CommandMeta | null {
  if (
    event.type !== "command.started" &&
    event.type !== "command.completed" &&
    event.type !== "command.failed"
  ) {
    return null;
  }

  const data = event.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const exitCode = typeof data.exitCode === "number" ? data.exitCode : undefined;
  const durationMs = typeof data.durationMs === "number" ? data.durationMs : undefined;
  const command = typeof data.command === "string" ? data.command : undefined;

  return {
    exitCode,
    durationMs,
    durationLabel: durationMs !== undefined ? formatDurationMs(durationMs) : undefined,
    command,
  };
}

export function formatCommandMetaLine(meta: CommandMeta): string | null {
  const parts: string[] = [];
  if (meta.exitCode !== undefined) {
    parts.push(`Exit code ${meta.exitCode}`);
  }
  if (meta.durationLabel) {
    parts.push(meta.durationLabel);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function isCommandFailureEvent(event: TimelineEvent): boolean {
  return event.type === "command.failed" || event.severity === "error";
}
