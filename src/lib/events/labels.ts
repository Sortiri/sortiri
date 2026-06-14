import type { EventCategory, EventSource, EventActor } from "@/types/events";

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  agent_action: "Agent Action",
  code_change: "Code Change",
  product_event: "Product Event",
  company_decision: "Decision",
  revenue_event: "Revenue",
  system_event: "System",
};

export const SOURCE_LABELS: Record<EventSource, string> = {
  cursor: "cursor",
  claude_code: "claude code",
  codex: "codex",
  sdk: "SDK",
  github: "GitHub",
  stripe: "stripe",
  posthog: "posthog",
  slack: "slack",
  linear: "linear",
  manual: "manual",
  system: "system",
  watcher: "watcher",
  cli: "CLI",
  other: "other",
};

export type TimelineFilterValue = EventCategory | null;

export const FILTER_OPTIONS: { label: string; value: TimelineFilterValue }[] = [
  { label: "All", value: null },
  { label: "Agent Actions", value: "agent_action" },
  { label: "Code Changes", value: "code_change" },
  { label: "Product Events", value: "product_event" },
  { label: "Decisions", value: "company_decision" },
  { label: "Revenue", value: "revenue_event" },
  { label: "System", value: "system_event" },
];

export function getCategoryLabel(category: EventCategory): string {
  return CATEGORY_LABELS[category];
}

export function getSourceLabel(source: EventSource): string {
  return SOURCE_LABELS[source];
}

export function getActorLabel(actor: EventActor): string {
  if (actor.name) return actor.name;
  if (actor.id) return actor.id;
  switch (actor.type) {
    case "agent":
      return "Agent";
    case "human":
      return "Human";
    case "system":
      return "System";
    case "customer":
      return "Customer";
    default:
      return "Unknown";
  }
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  "agent.workstream_started": "Started workstream",
  "agent.plan_created": "Created plan",
  "agent.decision_made": "Made decision",
  "file.changed": "Changed file",
  "file.created": "Created file",
  "file.deleted": "Deleted file",
  "artifact.created": "Attached artifact",
  "agent.workstream_completed": "Completed workstream",
  "user.signed_up": "User signed up",
  "user.activated": "User activated",
  "feature.used": "Feature used",
  "trial.started": "Trial started",
  "customer.churned": "Customer churned",
  "decision.made": "Decision made",
  "roadmap.changed": "Roadmap changed",
  "pricing.changed": "Pricing changed",
  "budget.approved": "Budget approved",
  "feature.approved": "Feature approved",
  "payment.received": "Payment received",
  "subscription.created": "Subscription created",
  "subscription.cancelled": "Subscription cancelled",
  "invoice.paid": "Invoice paid",
  "refund.issued": "Refund issued",
  "ask.question_submitted": "Ask question submitted",
  "github.pull_request.opened": "PR opened",
  "github.pull_request.merged": "PR merged",
  "github.pull_request.closed": "PR closed",
  "github.push": "Push",
  "github.issue.opened": "Issue opened",
  "github.issue.closed": "Issue closed",
  "github.issue.reopened": "Issue reopened",
  "github.release.published": "Release published",
  "github.test_event": "GitHub test event",
  "command.started": "Command Started",
  "command.completed": "Command Passed",
  "command.failed": "Command Failed",
  "cli.doctor_passed": "Doctor Passed",
};

export function getRevenueSummary(
  data: Record<string, unknown> | undefined,
  summary?: string,
): string | undefined {
  if (summary) return summary;
  if (!data || typeof data.amount !== "number") return undefined;
  const currency = typeof data.currency === "string" ? data.currency : "USD";
  return `Customer paid $${data.amount} ${currency}.`;
}

export function getEventTypeLabel(type: string): string | null {
  return EVENT_TYPE_LABELS[type] ?? null;
}
