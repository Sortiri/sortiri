import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getSortiriDir } from "./paths.js";

export const EVENTS_FILE_NAME = "events.jsonl";

export const timelineActorSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
});

export const timelineEventSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number().int().positive(),
  source: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  project: z.string().optional(),
  workstream: z.string().optional(),
  actor: timelineActorSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export function getEventsPath(cwd?: string): string {
  return path.join(getSortiriDir(cwd), EVENTS_FILE_NAME);
}

export function createEventId(): string {
  return `evt_${randomBytes(8).toString("hex")}`;
}

export function createWorkstreamId(): string {
  return `ws_${randomBytes(8).toString("hex")}`;
}

export function readEvents(cwd?: string): TimelineEvent[] {
  const eventsPath = getEventsPath(cwd);
  if (!fs.existsSync(eventsPath)) {
    return [];
  }

  const lines = fs.readFileSync(eventsPath, "utf8").split("\n");
  const events: TimelineEvent[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = timelineEventSchema.parse(JSON.parse(trimmed));
      events.push(parsed);
    } catch {
      // skip corrupt lines
    }
  }

  return events;
}

export function appendEvent(
  event: Omit<TimelineEvent, "id" | "timestamp"> & {
    id?: string;
    timestamp?: number;
  },
  cwd?: string,
): TimelineEvent {
  const sortiriDir = getSortiriDir(cwd);
  fs.mkdirSync(sortiriDir, { recursive: true });

  const full: TimelineEvent = timelineEventSchema.parse({
    id: event.id ?? createEventId(),
    timestamp: event.timestamp ?? Date.now(),
    ...event,
  });

  const eventsPath = getEventsPath(cwd);
  fs.appendFileSync(eventsPath, `${JSON.stringify(full)}\n`, "utf8");
  return full;
}

export function exportEvents(cwd?: string): string {
  const eventsPath = getEventsPath(cwd);
  if (!fs.existsSync(eventsPath)) {
    return "";
  }
  return fs.readFileSync(eventsPath, "utf8");
}

export function ensureEventsJournal(cwd?: string, seedSample = true): string {
  const eventsPath = getEventsPath(cwd);
  const sortiriDir = getSortiriDir(cwd);
  fs.mkdirSync(sortiriDir, { recursive: true });

  if (!fs.existsSync(eventsPath)) {
    fs.writeFileSync(eventsPath, "", "utf8");
  }

  if (seedSample && readEvents(cwd).length === 0) {
    appendEvent(
      {
        source: "system",
        type: "system.event",
        title: "Sortiri initialized",
        summary: "Local timeline journal created. Run sortiri record to add events.",
        actor: { type: "system", name: "Sortiri CLI" },
      },
      cwd,
    );
  }

  return eventsPath;
}
