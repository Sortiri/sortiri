import type { EventRecord } from "./eventsLib";
import type { WorkstreamRecord } from "./workstreamsLib";

export type InsightOverviewResult = {
  totalEvents: number;
  agentActions: number;
  codeChanges: number;
  productEvents: number;
  decisions: number;
  revenueEvents: number;
  systemEvents: number;
  activeWorkstreams: number;
  completedWorkstreams: number;
  topSources: { source: string; count: number }[];
  topCategories: { category: string; count: number }[];
  recentErrors: EventRecord[];
  recentDecisions: EventRecord[];
  recentProductEvents: EventRecord[];
};

function isErrorEvent(event: EventRecord): boolean {
  if (event.severity === "error" || event.severity === "critical") return true;
  return /failed|error|build\.failed|command\.failed/i.test(event.type);
}

function countBy<T extends string>(
  items: T[],
): { key: T; count: number }[] {
  const map = new Map<T, number>();
  for (const item of items) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildInsightOverview(
  events: EventRecord[],
  workstreams: WorkstreamRecord[],
): InsightOverviewResult {
  const agentActions = events.filter((e) => e.category === "agent_action").length;
  const codeChanges = events.filter((e) => e.category === "code_change").length;
  const productEvents = events.filter((e) => e.category === "product_event").length;
  const decisions = events.filter((e) => e.category === "company_decision").length;
  const revenueEvents = events.filter((e) => e.category === "revenue_event").length;
  const systemEvents = events.filter((e) => e.category === "system_event").length;

  const activeWorkstreams = workstreams.filter((ws) => ws.status === "active").length;
  const completedWorkstreams = workstreams.filter((ws) => ws.status === "completed").length;

  const topSources = countBy(events.map((e) => e.source)).slice(0, 5).map(({ key, count }) => ({
    source: key,
    count,
  }));

  const topCategories = countBy(events.map((e) => e.category))
    .slice(0, 5)
    .map(({ key, count }) => ({
      category: key,
      count,
    }));

  const recentErrors = events.filter(isErrorEvent).slice(0, 5);
  const recentDecisions = events
    .filter((e) => e.category === "company_decision")
    .slice(0, 5);
  const recentProductEvents = events
    .filter((e) => e.category === "product_event")
    .slice(0, 5);

  return {
    totalEvents: events.length,
    agentActions,
    codeChanges,
    productEvents,
    decisions,
    revenueEvents,
    systemEvents,
    activeWorkstreams,
    completedWorkstreams,
    topSources,
    topCategories,
    recentErrors,
    recentDecisions,
    recentProductEvents,
  };
}

export function formatOverviewForPrompt(overview: InsightOverviewResult): string {
  const lines = [
    `Total events: ${overview.totalEvents}`,
    `Agent actions: ${overview.agentActions}`,
    `Code changes: ${overview.codeChanges}`,
    `Product events: ${overview.productEvents}`,
    `Decisions: ${overview.decisions}`,
    `Revenue events: ${overview.revenueEvents}`,
    `System events: ${overview.systemEvents}`,
    `Active workstreams: ${overview.activeWorkstreams}`,
    `Completed workstreams: ${overview.completedWorkstreams}`,
    "",
    "Top sources:",
    ...overview.topSources.map((s) => `- ${s.source}: ${s.count}`),
    "",
    "Top categories:",
    ...overview.topCategories.map((c) => `- ${c.category}: ${c.count}`),
  ];
  return lines.join("\n");
}

export function formatEventsForPrompt(events: EventRecord[], limit = 15): string {
  return events
    .slice(0, limit)
    .map((event) => {
      const parts = [
        `[${event.id}]`,
        event.occurredAt,
        event.category,
        event.source,
        event.type,
        event.title,
      ];
      if (event.summary) parts.push(event.summary);
      return parts.join(" | ");
    })
    .join("\n");
}

export function formatWorkstreamsForPrompt(
  workstreams: WorkstreamRecord[],
  limit = 10,
): string {
  return workstreams
    .slice(0, limit)
    .map((ws) => `[${ws.id}] ${ws.status} | ${ws.title}`)
    .join("\n");
}

export function formatFindingsForPrompt(
  findings: {
    type: string;
    severity: string;
    title: string;
    summary: string;
    recommendation?: string;
  }[],
): string {
  if (findings.length === 0) return "(none)";
  return findings
    .map((f) => {
      const lines = [`[${f.severity}] ${f.type}: ${f.title}`, f.summary];
      if (f.recommendation) lines.push(`Recommendation: ${f.recommendation}`);
      return lines.join("\n");
    })
    .join("\n\n");
}
