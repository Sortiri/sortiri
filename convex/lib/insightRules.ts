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
    stripe: "Stripe",
    posthog: "PostHog",
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

const LARGE_REVENUE_THRESHOLD = 500;

function stripeEventData(event: EventRecord): Record<string, unknown> {
  if (event.data && typeof event.data === "object" && !Array.isArray(event.data)) {
    return event.data as Record<string, unknown>;
  }
  return {};
}

function stripeRevenueAmount(event: EventRecord): number | undefined {
  const data = stripeEventData(event);
  if (typeof data.amount === "number") return data.amount;
  if (typeof data.amountTotal === "number") return data.amountTotal;
  if (typeof data.amountPaid === "number") return data.amountPaid;
  if (typeof data.amountRefunded === "number") return data.amountRefunded;
  return undefined;
}

function addStripeRevenueFindings(
  events: EventRecord[],
  findings: InsightFindingInput[],
): void {
  const stripeEvents = events.filter((event) => event.source === "stripe");
  if (stripeEvents.length === 0) return;

  const paymentFailures = stripeEvents.filter((event) =>
    event.type === "stripe.payment_intent.payment_failed" ||
    event.type === "stripe.invoice.payment_failed",
  );
  if (paymentFailures.length > 0) {
    findings.push({
      type: "other",
      severity: "warning",
      title: "Payment failures detected",
      summary: `${paymentFailures.length} Stripe payment${paymentFailures.length === 1 ? "" : "s"} failed in the last 7 days.`,
      recommendation: "Review failed payments and follow up with affected customers.",
      evidenceEventIds: takeEventIds(paymentFailures),
      data: { count: paymentFailures.length, source: "stripe" },
    });
  }

  const refunds = stripeEvents.filter((event) => event.type === "stripe.charge.refunded");
  if (refunds.length > 0) {
    findings.push({
      type: "other",
      severity: "warning",
      title: "Refunds detected",
      summary: `${refunds.length} Stripe refund${refunds.length === 1 ? "" : "s"} were recorded recently.`,
      recommendation: "Confirm whether refunds were expected and document the reason.",
      evidenceEventIds: takeEventIds(refunds),
      data: { count: refunds.length, source: "stripe" },
    });
  }

  const cancellations = stripeEvents.filter(
    (event) => event.type === "stripe.customer.subscription.deleted",
  );
  if (cancellations.length > 0) {
    findings.push({
      type: "other",
      severity: "warning",
      title: "Subscription canceled",
      summary:
        cancellations.length === 1
          ? "A customer subscription was canceled after recent product activity."
          : `${cancellations.length} customer subscriptions were canceled recently.`,
      recommendation: "Review churn signals and recent product changes.",
      evidenceEventIds: takeEventIds(cancellations),
      data: { count: cancellations.length, source: "stripe" },
    });
  }

  const revenueWins = stripeEvents.filter(
    (event) =>
      event.category === "revenue_event" &&
      (event.type === "stripe.payment_intent.succeeded" ||
        event.type === "stripe.invoice.paid" ||
        event.type === "stripe.checkout.session.completed"),
  );
  if (revenueWins.length > 0) {
    const largest = revenueWins.reduce((max, event) => {
      const amount = stripeRevenueAmount(event) ?? 0;
      const maxAmount = stripeRevenueAmount(max) ?? 0;
      return amount > maxAmount ? event : max;
    }, revenueWins[0]!);
    const largestAmount = stripeRevenueAmount(largest) ?? 0;

    findings.push({
      type: "other",
      severity: largestAmount >= LARGE_REVENUE_THRESHOLD ? "critical" : "info",
      title: "Revenue movement detected",
      summary: `${revenueWins.length} Stripe revenue event${revenueWins.length === 1 ? "" : "s"} were recorded recently.`,
      recommendation: "Connect revenue events to the product and agent work that drove them.",
      evidenceEventIds: takeEventIds(revenueWins),
      data: { count: revenueWins.length, source: "stripe", largestAmount },
    });
  }

  const byCustomer = new Map<string, EventRecord[]>();
  for (const event of stripeEvents) {
    const customerId = stripeEventData(event).customerId;
    if (typeof customerId !== "string") continue;
    const list = byCustomer.get(customerId) ?? [];
    list.push(event);
    byCustomer.set(customerId, list);
  }

  const activeCustomers = Array.from(byCustomer.entries()).filter(([, list]) => list.length >= 2);
  if (activeCustomers.length > 0) {
    const [customerId, customerEvents] = activeCustomers[0]!;
    findings.push({
      type: "other",
      severity: "info",
      title: "Customer revenue activity",
      summary: `Customer ${customerId} had ${customerEvents.length} Stripe events recently.`,
      recommendation: "Review this customer's payment and subscription timeline.",
      evidenceEventIds: takeEventIds(customerEvents),
      data: { customerId, count: customerEvents.length, source: "stripe" },
    });
  }
}

function posthogEventData(event: EventRecord): Record<string, unknown> {
  if (event.data && typeof event.data === "object" && !Array.isArray(event.data)) {
    return event.data as Record<string, unknown>;
  }
  return {};
}

function addPostHogProductFindings(
  events: EventRecord[],
  findings: InsightFindingInput[],
): void {
  const posthogEvents = events.filter((event) => event.source === "posthog");
  if (posthogEvents.length === 0) return;

  findings.push({
    type: "product_movement",
    severity: "info",
    title: "PostHog product activity detected",
    summary: `${posthogEvents.length} PostHog product event${posthogEvents.length === 1 ? "" : "s"} were recorded recently.`,
    recommendation: "Review product usage alongside agent and engineering work.",
    evidenceEventIds: takeEventIds(posthogEvents),
    data: { count: posthogEvents.length, source: "posthog" },
  });

  const signups = posthogEvents.filter((event) => event.type === "posthog.user.signed_up");
  if (signups.length >= 2) {
    findings.push({
      type: "product_movement",
      severity: "info",
      title: "Signup spike detected",
      summary: `${signups.length} user signups were recorded via PostHog.`,
      recommendation: "Connect signup activity to growth and onboarding workstreams.",
      evidenceEventIds: takeEventIds(signups),
      data: { count: signups.length, source: "posthog" },
    });
  }

  const activations = posthogEvents.filter(
    (event) => event.type === "posthog.activation.completed",
  );
  if (activations.length > 0) {
    findings.push({
      type: "product_movement",
      severity: "info",
      title: "Activation movement detected",
      summary: `${activations.length} activation milestone${activations.length === 1 ? "" : "s"} completed.`,
      recommendation: "Track which work preceded successful activation.",
      evidenceEventIds: takeEventIds(activations),
      data: { count: activations.length, source: "posthog" },
    });
  }

  const featureUsage = posthogEvents.filter((event) => event.type === "posthog.feature.used");
  const featureCounts = new Map<string, number>();
  for (const event of featureUsage) {
    const data = posthogEventData(event);
    const featureKey =
      (typeof data.feature === "string" && data.feature) ||
      (typeof data.feature_key === "string" && data.feature_key) ||
      (typeof data.$pathname === "string" && data.$pathname) ||
      (typeof data.pathname === "string" && data.pathname) ||
      "unknown";
    featureCounts.set(featureKey, (featureCounts.get(featureKey) ?? 0) + 1);
  }
  const topFeature = Array.from(featureCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topFeature && topFeature[1] >= 2) {
    const [featureKey, count] = topFeature;
    const related = featureUsage.filter((event) => {
      const data = posthogEventData(event);
      return (
        data.feature === featureKey ||
        data.feature_key === featureKey ||
        data.$pathname === featureKey ||
        data.pathname === featureKey
      );
    });
    findings.push({
      type: "product_movement",
      severity: "info",
      title: "Feature usage hotspot",
      summary: `Feature "${featureKey}" was used ${count} times recently.`,
      recommendation: "Investigate what drove repeated usage of this feature.",
      evidenceEventIds: takeEventIds(related),
      data: { featureKey, count, source: "posthog" },
    });
  }

  const revenueIntent = posthogEvents.filter(
    (event) =>
      event.type === "posthog.checkout.clicked" ||
      /pricing|checkout/i.test(event.type),
  );
  const stripeRevenue = events.filter(
    (event) => event.source === "stripe" && event.category === "revenue_event",
  );
  if (revenueIntent.length > 0 && stripeRevenue.length === 0) {
    findings.push({
      type: "product_movement",
      severity: "warning",
      title: "Revenue intent without payment",
      summary: `${revenueIntent.length} checkout or pricing interaction${revenueIntent.length === 1 ? "" : "s"} had no matching Stripe revenue event.`,
      recommendation: "Follow up on users who viewed pricing or checkout without paying.",
      evidenceEventIds: takeEventIds(revenueIntent),
      data: {
        posthogCount: revenueIntent.length,
        stripeRevenueCount: stripeRevenue.length,
        source: "posthog",
      },
    });
  }
}

function addImpactOpportunityFindings(
  events: EventRecord[],
  workstreams: WorkstreamRecord[],
  findings: InsightFindingInput[],
): void {
  const prMerged = events.find((event) => event.type === "github.pull_request.merged");
  const prOpened = events.find((event) => event.type === "github.pull_request.opened");
  const decision = events.find((event) => event.category === "company_decision");
  const completedWorkstream = workstreams.find((ws) => ws.status === "completed");

  if (prMerged) {
    findings.push({
      type: "impact_opportunity",
      severity: "info",
      title: "Run impact analysis after PR merge",
      summary:
        "A pull request was merged recently. An impact analysis may reveal product or revenue movement in the window after this change.",
      recommendation: "Analyze impact anchored to this PR merge event.",
      evidenceEventIds: [prMerged.id as Id<"events">],
      data: { anchorType: "event", anchorId: prMerged.id, anchorTitle: prMerged.title },
    });
    return;
  }

  if (prOpened) {
    findings.push({
      type: "impact_opportunity",
      severity: "info",
      title: "Consider impact analysis for this PR",
      summary:
        "A pull request was opened recently. After merge, run impact analysis to compare baseline vs impact windows.",
      recommendation: "Analyze impact after the PR merges.",
      evidenceEventIds: [prOpened.id as Id<"events">],
      data: { anchorType: "event", anchorId: prOpened.id, anchorTitle: prOpened.title },
    });
    return;
  }

  if (decision) {
    findings.push({
      type: "impact_opportunity",
      severity: "info",
      title: "Analyze impact around this decision",
      summary:
        "A company decision was recorded. Impact analysis can compare activity before and after this anchor.",
      recommendation: "Run impact analysis anchored to this decision.",
      evidenceEventIds: [decision.id as Id<"events">],
      data: { anchorType: "event", anchorId: decision.id, anchorTitle: decision.title },
    });
    return;
  }

  if (completedWorkstream) {
    findings.push({
      type: "impact_opportunity",
      severity: "info",
      title: "Analyze workstream impact",
      summary:
        "A workstream completed recently. Impact analysis may show related product, revenue, or engineering movement.",
      recommendation: "Run impact analysis anchored to this workstream.",
      evidenceWorkstreamIds: [completedWorkstream.id as Id<"workstreams">],
      data: {
        anchorType: "workstream",
        anchorId: completedWorkstream.id,
        anchorTitle: completedWorkstream.title,
      },
    });
  }
}

function addLessonOpportunityFindings(
  events: EventRecord[],
  findings: InsightFindingInput[],
): void {
  const impactGenerated = events.filter(
    (event) => event.type === "impact_analysis.generated",
  );
  if (impactGenerated.length > 0) {
    const latest = impactGenerated[0]!;
    findings.push({
      type: "lesson_opportunity",
      severity: "info",
      title: "Generate lessons from impact analysis",
      summary:
        "An impact analysis was generated recently. Lessons may capture repeatable patterns from its findings.",
      recommendation: "Generate lessons from the impact analysis findings.",
      evidenceEventIds: [latest.id as Id<"events">],
      data: {
        cta: "generate_lesson",
        impactAnalysisId: latest.entity?.id,
      },
    });
  }

  const commandFailures = events.filter((event) => event.type === "command.failed");
  if (commandFailures.length >= 3) {
    findings.push({
      type: "lesson_opportunity",
      severity: "warning",
      title: "Repeated command failures",
      summary: `${commandFailures.length} command failures appeared recently. A validation lesson may help prevent repeats.`,
      recommendation: "Generate a lesson from failure patterns and run validation scripts.",
      evidenceEventIds: takeEventIds(commandFailures),
      data: { cta: "generate_failure_lesson" },
    });
  }

  const webhookFailures = events.filter(
    (event) =>
      event.type.includes("webhook") &&
      (event.type.includes("fail") || event.type.includes("signature")),
  );
  if (webhookFailures.length >= 3) {
    findings.push({
      type: "lesson_opportunity",
      severity: "warning",
      title: "Webhook validation failures",
      summary: `${webhookFailures.length} webhook-related failures detected. Consider a validation lesson.`,
      recommendation: "Run webhook test scripts and capture a validation lesson.",
      evidenceEventIds: takeEventIds(webhookFailures),
      data: { cta: "generate_failure_lesson" },
    });
  }
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
  addPostHogProductFindings(args.events, findings);
  addDecisionFindings(args.events, findings);
  addTeamChangeFindings(args.events, findings);
  addStripeRevenueFindings(args.events, findings);
  addImpactOpportunityFindings(args.events, args.workstreams, findings);
  addLessonOpportunityFindings(args.events, findings);

  return findings.slice(0, MAX_FINDINGS);
}
