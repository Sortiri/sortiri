import type { Id } from "../_generated/dataModel";
import type { EventRecord } from "./eventsLib";
import type { InsightFindingInput } from "./insightRunsLib";
import type { WorkstreamRecord } from "./workstreamsLib";

const MAX_FINDINGS = 15;
const STALE_WORKSTREAM_MS = 24 * 60 * 60 * 1000;

const DUPLICATE_KEYWORDS = [
  "homepage",
  "pricing",
  "onboarding",
  "smoke",
  "cta",
  "landing",
  "auth",
  "signup",
  "build",
];

type GenerateFindingsArgs = {
  events: EventRecord[];
  workstreams: WorkstreamRecord[];
  windowStart: number;
  windowEnd: number;
};

function takeEventIds(events: EventRecord[], limit = 5): Id<"events">[] {
  return events.slice(0, limit).map((e) => e.id as Id<"events">);
}

function takeWorkstreamIds(
  workstreams: WorkstreamRecord[],
  limit = 5,
): Id<"workstreams">[] {
  return workstreams.slice(0, limit).map((ws) => ws.id as Id<"workstreams">);
}

function isErrorEvent(event: EventRecord): boolean {
  if (event.severity === "error" || event.severity === "critical") return true;
  return /failed|error|build\.failed|command\.failed/i.test(event.type);
}

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    cursor: "Cursor Agent",
    watcher: "Sortiri Watcher",
    cli: "Sortiri CLI",
    sdk: "SDK",
    system: "System",
    github: "GitHub",
  };
  return labels[source] ?? source;
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    agent_action: "agent actions",
    code_change: "code changes",
    product_event: "product events",
    company_decision: "decisions",
    revenue_event: "revenue events",
    system_event: "system events",
  };
  return labels[category] ?? category;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function addSourceHotspotFindings(
  events: EventRecord[],
  findings: InsightFindingInput[],
): void {
  const bySource = new Map<string, EventRecord[]>();
  for (const event of events) {
    const list = bySource.get(event.source) ?? [];
    list.push(event);
    bySource.set(event.source, list);
  }

  for (const [source, sourceEvents] of bySource) {
    if (sourceEvents.length < 5) continue;
    const label = sourceLabel(source);
    findings.push({
      type: "hotspot",
      severity: sourceEvents.length >= 10 ? "warning" : "info",
      title: `High activity from ${label}`,
      summary: `${label} generated ${sourceEvents.length} events in this period.`,
      evidenceEventIds: takeEventIds(sourceEvents),
      data: { source, count: sourceEvents.length },
    });
  }
}

function addCategoryHotspotFindings(
  events: EventRecord[],
  findings: InsightFindingInput[],
): void {
  const byCategory = new Map<string, EventRecord[]>();
  for (const event of events) {
    const list = byCategory.get(event.category) ?? [];
    list.push(event);
    byCategory.set(event.category, list);
  }

  for (const [category, categoryEvents] of byCategory) {
    if (categoryEvents.length < 5) continue;
    findings.push({
      type: "hotspot",
      severity: "info",
      title: `High ${categoryLabel(category)} volume`,
      summary: `${categoryEvents.length} ${categoryLabel(category)} were recorded in this period.`,
      evidenceEventIds: takeEventIds(categoryEvents),
      data: { category, count: categoryEvents.length },
    });
  }
}

function addFileHotspotFindings(
  events: EventRecord[],
  findings: InsightFindingInput[],
): void {
  const byFile = new Map<string, EventRecord[]>();
  for (const event of events) {
    if (event.category !== "code_change" || !event.entity?.name) continue;
    const fileName = event.entity.name;
    const list = byFile.get(fileName) ?? [];
    list.push(event);
    byFile.set(fileName, list);
  }

  for (const [fileName, fileEvents] of byFile) {
    if (fileEvents.length < 3) continue;
    findings.push({
      type: "hotspot",
      severity: "warning",
      title: `${fileName} changed repeatedly`,
      summary: `The file ${fileName} changed ${fileEvents.length} times in this period.`,
      recommendation:
        "Open the replay to verify whether these changes were part of one task or repeated rework.",
      evidenceEventIds: takeEventIds(fileEvents),
      data: { fileName, count: fileEvents.length, entityType: "file", entityKey: fileName },
    });
  }
}

function addCommandFailureFindings(
  events: EventRecord[],
  findings: InsightFindingInput[],
): void {
  const commandFailures = events.filter((e) => e.type === "command.failed");
  if (commandFailures.length === 0) return;

  const severity = commandFailures.length >= 3 ? "critical" : "warning";
  const sample = commandFailures[0]!;
  const artifactIds = commandFailures.flatMap((e) => e.artifactIds ?? []).slice(0, 5);

  findings.push({
    type: "error",
    severity,
    title: "Command failure detected",
    summary:
      sample.summary ??
      `${commandFailures.length} command${commandFailures.length === 1 ? "" : "s"} failed in this period.`,
    recommendation:
      "Open the command output artifact and replay the workstream to inspect the failure.",
    evidenceEventIds: takeEventIds(commandFailures),
    data: {
      count: commandFailures.length,
      artifactIds,
      command: (sample.data as Record<string, unknown> | undefined)?.command,
    },
  });
}

function addErrorFindings(
  events: EventRecord[],
  findings: InsightFindingInput[],
): void {
  const errorEvents = events.filter(
    (e) => isErrorEvent(e) && e.type !== "command.failed",
  );
  if (errorEvents.length === 0) return;

  const hasCritical = errorEvents.some((e) => e.severity === "critical");
  const sample = errorEvents[0]!;

  findings.push({
    type: "error",
    severity: hasCritical ? "critical" : "warning",
    title: "Build or command failure detected",
    summary:
      sample.summary ??
      `${errorEvents.length} error event${errorEvents.length === 1 ? "" : "s"} recorded in this period.`,
    evidenceEventIds: takeEventIds(errorEvents),
    data: { count: errorEvents.length },
  });
}

function addStaleWorkstreamFindings(
  workstreams: WorkstreamRecord[],
  findings: InsightFindingInput[],
  now: number,
): void {
  const stale = workstreams.filter(
    (ws) => ws.status === "active" && ws.startedAt < now - STALE_WORKSTREAM_MS,
  );

  for (const ws of stale) {
    const hours = Math.round((now - ws.startedAt) / (60 * 60 * 1000));
    findings.push({
      type: "stale_workstream",
      severity: "warning",
      title: "Active workstream has not been completed",
      summary: `"${ws.title}" is still active after more than ${hours} hours.`,
      recommendation:
        "Finish or archive this workstream so the replay history stays clean.",
      evidenceWorkstreamIds: [ws.id as Id<"workstreams">],
      data: { workstreamId: ws.id, hours },
    });
  }
}

function addDuplicateWorkFindings(
  events: EventRecord[],
  workstreams: WorkstreamRecord[],
  findings: InsightFindingInput[],
): void {
  for (const keyword of DUPLICATE_KEYWORDS) {
    const matchingEvents = events.filter((e) =>
      normalizeTitle(e.title).includes(keyword),
    );
    const matchingWorkstreams = workstreams.filter((ws) =>
      normalizeTitle(ws.title).includes(keyword),
    );
    const total = matchingEvents.length + matchingWorkstreams.length;
    if (total < 3) continue;

    findings.push({
      type: "duplicate_work",
      severity: "info",
      title: `Repeated ${keyword} work detected`,
      summary: `Several events and workstreams mention "${keyword}". This may be intentional iteration or duplicate work.`,
      recommendation: "Review replays to confirm whether this work was coordinated.",
      evidenceEventIds: takeEventIds(matchingEvents),
      evidenceWorkstreamIds: takeWorkstreamIds(matchingWorkstreams),
      data: { keyword, count: total },
    });
  }
}

function addProductMovementFindings(
  events: EventRecord[],
  findings: InsightFindingInput[],
): void {
  const productEvents = events.filter((e) => e.category === "product_event");
  if (productEvents.length === 0) return;

  const signupCount = productEvents.filter((e) =>
    e.type.includes("signed_up"),
  ).length;

  const signupEvent = productEvents.find((e) => e.type.includes("signed_up"));

  findings.push({
    type: "product_movement",
    severity: "info",
    title: "Product events recorded",
    summary:
      signupCount > 0
        ? `${productEvents.length} product event${productEvents.length === 1 ? "" : "s"} were recorded, including user signups.`
        : `${productEvents.length} product event${productEvents.length === 1 ? "" : "s"} were recorded in this period.`,
    recommendation: "Connect these events to the workstreams that caused them.",
    evidenceEventIds: takeEventIds(productEvents),
    data: {
      count: productEvents.length,
      ...(signupEvent?.actor.id
        ? { entityType: "user", entityKey: signupEvent.actor.id }
        : {}),
    },
  });
}

function addDecisionFindings(
  events: EventRecord[],
  findings: InsightFindingInput[],
): void {
  const decisionEvents = events.filter((e) => e.category === "company_decision");
  if (decisionEvents.length === 0) return;

  const latest = decisionEvents[0]!;

  findings.push({
    type: "decision",
    severity: "info",
    title: "New company decision recorded",
    summary: latest.summary ?? latest.title,
    evidenceEventIds: takeEventIds(decisionEvents),
    data: { count: decisionEvents.length },
  });
}

function addTeamChangeFindings(
  events: EventRecord[],
  findings: InsightFindingInput[],
): void {
  const teamEvents = events.filter((event) =>
    event.type.startsWith("workspace.member_"),
  );
  if (teamEvents.length === 0) return;

  findings.push({
    type: "other",
    severity: "info",
    title: "Team access changed",
    summary: `${teamEvents.length} team membership change${teamEvents.length === 1 ? "" : "s"} in this window.`,
    evidenceEventIds: takeEventIds(teamEvents),
    data: { count: teamEvents.length },
  });
}

export function generateDeterministicFindings(
  args: GenerateFindingsArgs,
): InsightFindingInput[] {
  const findings: InsightFindingInput[] = [];
  const now = args.windowEnd;

  addSourceHotspotFindings(args.events, findings);
  addCategoryHotspotFindings(args.events, findings);
  addFileHotspotFindings(args.events, findings);
  addCommandFailureFindings(args.events, findings);
  addErrorFindings(args.events, findings);
  addStaleWorkstreamFindings(args.workstreams, findings, now);
  addDuplicateWorkFindings(args.events, args.workstreams, findings);
  addProductMovementFindings(args.events, findings);
  addDecisionFindings(args.events, findings);
  addTeamChangeFindings(args.events, findings);

  return findings.slice(0, MAX_FINDINGS);
}
