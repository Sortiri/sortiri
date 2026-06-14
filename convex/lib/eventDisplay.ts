import type { Doc } from "../_generated/dataModel";
import type { EventCategory, EventSource } from "./eventTypes";

export type EventImportance = "low" | "normal" | "high" | "critical";
export type EventVisibility = "primary" | "debug" | "hidden";

export type EventDisplayFields = {
  importance: EventImportance;
  visibility: EventVisibility;
  displayReason: string;
};

export type ClassifyEventInput = {
  source: EventSource | string;
  category: EventCategory | string;
  type: string;
  title?: string;
  summary?: string;
  severity?: string;
  workstreamId?: string;
  entity?: { type?: string; name?: string; url?: string };
  data?: unknown;
  isUserPinned?: boolean;
  isUserHidden?: boolean;
};

export type VisibilityFilterMode = "primary" | "debug" | "hidden" | "all";

const MEANINGFUL_COMMAND_PATTERNS = [
  /\bnpm run build\b/i,
  /\bnpm test\b/i,
  /\bpnpm test\b/i,
  /\bpnpm lint\b/i,
  /\bnpx tsc\b/i,
  /\bnext build\b/i,
  /\bvitest\b/i,
  /\bplaywright\b/i,
];

const TRIVIAL_COMMAND_PATTERNS = [
  /^\s*echo\b/i,
  /^\s*pwd\s*$/i,
  /^\s*ls\b/i,
  /^\s*false\s*$/i,
  /^\s*true\s*$/i,
];

const IMPORTANT_FILE_PATHS = [
  "package.json",
  "convex/schema.ts",
  "app/page.tsx",
];

function extractCommand(event: ClassifyEventInput): string | null {
  const data = event.data as Record<string, unknown> | undefined;
  if (typeof data?.command === "string") {
    return data.command.trim();
  }

  const title = event.title ?? "";
  const prefixes = [
    "Started command: ",
    "Command passed: ",
    "Command failed: ",
    "Output for ",
  ];
  for (const prefix of prefixes) {
    if (title.startsWith(prefix)) {
      return title.slice(prefix.length).trim();
    }
  }
  return null;
}

function isMeaningfulCommand(command: string): boolean {
  return MEANINGFUL_COMMAND_PATTERNS.some((pattern) => pattern.test(command));
}

function isTrivialCommand(command: string): boolean {
  return TRIVIAL_COMMAND_PATTERNS.some((pattern) => pattern.test(command));
}

function isImportantFilePath(name?: string): boolean {
  if (!name) return false;
  const normalized = name.replace(/\\/g, "/");
  return IMPORTANT_FILE_PATHS.some(
    (path) => normalized.endsWith(path) || normalized.includes(`/${path}`),
  );
}

function titleContains(event: ClassifyEventInput, needle: string): boolean {
  return (event.title ?? "").toLowerCase().includes(needle.toLowerCase());
}

export function classifyEventForDisplay(event: ClassifyEventInput): EventDisplayFields {
  if (event.isUserHidden) {
    return {
      importance: "low",
      visibility: "hidden",
      displayReason: "User hid this event",
    };
  }

  if (event.isUserPinned) {
    return {
      importance: "high",
      visibility: "primary",
      displayReason: "User marked as important",
    };
  }

  if (event.severity === "error" || event.severity === "critical") {
    return {
      importance: event.severity === "critical" ? "critical" : "high",
      visibility: "primary",
      displayReason: "Error or critical severity",
    };
  }

  if (event.type === "command.failed") {
    return {
      importance: "high",
      visibility: "primary",
      displayReason: "Command failed",
    };
  }

  if (
    event.type === "github.test_event" ||
    event.type === "source.test_event" ||
    titleContains(event, "test event")
  ) {
    return {
      importance: "low",
      visibility: "debug",
      displayReason: "Test event",
    };
  }

  if (event.type === "cli.doctor_passed" || titleContains(event, "doctor")) {
    return {
      importance: "low",
      visibility: "debug",
      displayReason: "Doctor or setup check",
    };
  }

  if (event.type === "command.started") {
    return {
      importance: "low",
      visibility: "debug",
      displayReason: "Command started",
    };
  }

  if (event.category === "revenue_event") {
    return {
      importance: "high",
      visibility: "primary",
      displayReason: "Revenue event",
    };
  }

  if (event.category === "company_decision") {
    return {
      importance: "high",
      visibility: "primary",
      displayReason: "Company decision",
    };
  }

  if (event.category === "product_event") {
    return {
      importance: "normal",
      visibility: "primary",
      displayReason: "Product event",
    };
  }

  if (event.source === "github") {
    const importance = event.type.includes("merged") ? "high" : "normal";
    return {
      importance,
      visibility: "primary",
      displayReason: "GitHub activity",
    };
  }

  if (event.type === "command.completed") {
    const command = extractCommand(event);
    if (command && isMeaningfulCommand(command)) {
      return {
        importance: "normal",
        visibility: "primary",
        displayReason: "Meaningful command completed",
      };
    }
    if (command && isTrivialCommand(command)) {
      return {
        importance: "low",
        visibility: "debug",
        displayReason: "Trivial command completed",
      };
    }
    return {
      importance: "normal",
      visibility: "primary",
      displayReason: "Command completed",
    };
  }

  if (
    event.type === "agent.workstream_started" ||
    event.type === "agent.workstream_completed" ||
    event.type === "agent.plan_created" ||
    event.type === "agent.decision_made"
  ) {
    return {
      importance: "normal",
      visibility: "primary",
      displayReason: "Agent milestone",
    };
  }

  if (event.type === "file.changed" || event.type === "file.created" || event.type === "file.deleted") {
    if (isImportantFilePath(event.entity?.name)) {
      return {
        importance: "normal",
        visibility: "primary",
        displayReason: "Important file changed",
      };
    }
    if (event.workstreamId) {
      return {
        importance: "normal",
        visibility: "primary",
        displayReason: "File change in active workstream",
      };
    }
    return {
      importance: "low",
      visibility: "debug",
      displayReason: "File change outside workstream",
    };
  }

  return {
    importance: "normal",
    visibility: "primary",
    displayReason: "Default primary event",
  };
}

export function resolveEventDisplayFields(
  input: ClassifyEventInput & {
    importance?: EventImportance;
    visibility?: EventVisibility;
    displayReason?: string;
  },
): EventDisplayFields {
  if (input.importance && input.visibility && input.displayReason) {
    return {
      importance: input.importance,
      visibility: input.visibility,
      displayReason: input.displayReason,
    };
  }

  const classified = classifyEventForDisplay(input);

  return {
    importance: input.importance ?? classified.importance,
    visibility: input.visibility ?? classified.visibility,
    displayReason: input.displayReason ?? classified.displayReason,
  };
}

export function getEffectiveDisplayFields(
  doc: Doc<"events">,
): EventDisplayFields {
  if (doc.visibility && doc.importance && doc.displayReason) {
    if (doc.isUserHidden) {
      return {
        importance: doc.importance,
        visibility: "hidden",
        displayReason: doc.displayReason,
      };
    }
    if (doc.isUserPinned) {
      return {
        importance: "high",
        visibility: "primary",
        displayReason: doc.displayReason,
      };
    }
    return {
      importance: doc.importance,
      visibility: doc.visibility,
      displayReason: doc.displayReason,
    };
  }

  return classifyEventForDisplay({
    source: doc.source,
    category: doc.category,
    type: doc.type,
    title: doc.title,
    summary: doc.summary,
    severity: doc.severity,
    workstreamId: doc.workstreamId,
    entity: doc.entity,
    data: doc.data,
    isUserPinned: doc.isUserPinned,
    isUserHidden: doc.isUserHidden,
  });
}

export function matchesVisibilityFilter(
  doc: Doc<"events">,
  mode: VisibilityFilterMode,
  options?: { includeHidden?: boolean; includeDebug?: boolean },
): boolean {
  const fields = getEffectiveDisplayFields(doc);

  if (doc.isUserHidden || fields.visibility === "hidden") {
    return mode === "hidden" || options?.includeHidden === true;
  }

  if (doc.isUserPinned) {
    return mode === "primary" || mode === "all";
  }

  switch (mode) {
    case "primary":
      return fields.visibility === "primary";
    case "debug":
      return fields.visibility === "debug";
    case "hidden":
      return false;
    case "all":
      if (fields.visibility === "debug") {
        return options?.includeDebug !== false;
      }
      return true;
    default:
      return true;
  }
}

export function filterEventsForInsights<T extends ClassifyEventInput & Partial<EventDisplayFields>>(events: T[]): T[] {
  return events.filter((event) => {
    if (event.isUserHidden) return false;
    const fields = getDisplayFieldsFromRecord(event);
    if (fields.visibility === "hidden") return false;
    if (fields.visibility === "primary" || event.isUserPinned) return true;
    return event.severity === "error" || event.severity === "critical";
  });
}

function getDisplayFieldsFromRecord(
  event: ClassifyEventInput & Partial<EventDisplayFields>,
): EventDisplayFields {
  if (event.isUserHidden) {
    return {
      importance: event.importance ?? "low",
      visibility: "hidden",
      displayReason: event.displayReason ?? "User hid this event",
    };
  }
  if (event.isUserPinned) {
    return {
      importance: "high",
      visibility: "primary",
      displayReason: event.displayReason ?? "User marked as important",
    };
  }
  if (event.visibility && event.importance && event.displayReason) {
    return {
      importance: event.importance,
      visibility: event.visibility,
      displayReason: event.displayReason,
    };
  }
  return classifyEventForDisplay(event);
}

export function filterPrimaryEventRecords<T extends ClassifyEventInput & Partial<EventDisplayFields>>(events: T[]): T[] {
  return events.filter((event) => {
    if (event.isUserHidden) return false;
    const fields = getDisplayFieldsFromRecord(event);
    return fields.visibility === "primary" || event.isUserPinned === true;
  });
}

const ASK_DEBUG_KEYWORDS = [
  "raw",
  "debug",
  "commands",
  "command",
  "terminal",
  "build",
  "test",
  "failed",
  "output",
  "watcher",
];

export function questionRequestsDebugEvents(question: string): boolean {
  const normalized = question.toLowerCase();
  return ASK_DEBUG_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
