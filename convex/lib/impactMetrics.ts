import type { Id } from "../_generated/dataModel";
import type { EventRecord } from "./eventsLib";
import type { WorkstreamRecord } from "./workstreamsLib";

export type ProductMetrics = {
  productEvents: number;
  uniqueUsers: number;
  signups: number;
  activations: number;
  featureUsageEvents: number;
  checkoutIntentEvents: number;
  pricingViewedEvents: number;
  inviteEvents: number;
  topFeatures: Array<{ name: string; count: number }>;
  topUsers: Array<{ id: string; count: number }>;
};

export type RevenueMetrics = {
  paymentsSucceeded: number;
  paymentsFailed: number;
  invoicesPaid: number;
  subscriptionsCreated: number;
  subscriptionsCanceled: number;
  refunds: number;
  grossRevenueAmount: Record<string, number>;
  refundAmount: Record<string, number>;
  netRevenueAmount: Record<string, number>;
};

export type EngineeringMetrics = {
  agentEvents: number;
  codeChangeEvents: number;
  githubEvents: number;
  cliEvents: number;
  watcherEvents: number;
  prOpened: number;
  prMerged: number;
  commandsPassed: number;
  commandsFailed: number;
  workstreamsStarted: number;
  workstreamsCompleted: number;
};

export type DecisionMetrics = {
  decisionsMade: number;
  linkedEntityCount: number;
  keywords: string[];
};

export type ImpactMetricsBundle = {
  product: ProductMetrics;
  revenue: RevenueMetrics;
  engineering: EngineeringMetrics;
  decisions: DecisionMetrics;
};

export type ImpactMetricsDelta = {
  product: Partial<Record<keyof ProductMetrics, number | null>>;
  revenue: Partial<Record<keyof RevenueMetrics, number | Record<string, number> | null>>;
  engineering: Partial<Record<keyof EngineeringMetrics, number | null>>;
  decisions: Partial<Record<keyof DecisionMetrics, number | string[] | null>>;
};

function eventData(event: EventRecord): Record<string, unknown> {
  if (event.data && typeof event.data === "object" && !Array.isArray(event.data)) {
    return event.data as Record<string, unknown>;
  }
  return {};
}

function stripeAmount(event: EventRecord): { amount: number; currency: string } | null {
  const data = eventData(event);
  const currency = typeof data.currency === "string" ? data.currency.toLowerCase() : "usd";
  if (typeof data.amount === "number") return { amount: data.amount, currency };
  if (typeof data.amountTotal === "number") return { amount: data.amountTotal, currency };
  if (typeof data.amountPaid === "number") return { amount: data.amountPaid, currency };
  if (typeof data.amountRefunded === "number") return { amount: data.amountRefunded, currency };
  return null;
}

function addCurrencyAmount(
  record: Record<string, number>,
  currency: string,
  amount: number,
): void {
  record[currency] = (record[currency] ?? 0) + amount;
}

function actorId(event: EventRecord): string | undefined {
  return event.actor.id ?? event.actor.email ?? event.actor.name;
}

function featureName(event: EventRecord): string | undefined {
  const data = eventData(event);
  if (typeof data.feature === "string") return data.feature;
  if (typeof data.feature_key === "string") return data.feature_key;
  if (typeof data.pathname === "string") return data.pathname;
  return event.entity?.name;
}

function topCounts(
  counts: Map<string, number>,
  limit = 5,
): Array<{ name: string; count: number }> {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function isProductEvent(event: EventRecord): boolean {
  return (
    event.category === "product_event" &&
    (event.source === "posthog" || event.source === "sdk" || event.source === "manual")
  );
}

function isRevenueEvent(event: EventRecord): boolean {
  return (
    event.category === "revenue_event" &&
    (event.source === "stripe" || event.source === "sdk")
  );
}

export function computeProductMetrics(events: EventRecord[]): ProductMetrics {
  const productEvents = events.filter(isProductEvent);
  const users = new Map<string, number>();
  const features = new Map<string, number>();

  let signups = 0;
  let activations = 0;
  let featureUsageEvents = 0;
  let checkoutIntentEvents = 0;
  let pricingViewedEvents = 0;
  let inviteEvents = 0;

  for (const event of productEvents) {
    const actor = actorId(event);
    if (actor) {
      users.set(actor, (users.get(actor) ?? 0) + 1);
    }

    const type = event.type.toLowerCase();
    if (type.includes("signed_up") || type.includes("signup") || type.includes("sign_up")) {
      signups += 1;
    }
    if (type.includes("activation") || type.includes("onboarding_completed")) {
      activations += 1;
    }
    if (type.includes("feature") || type.includes("pageview") || type.includes("clicked")) {
      featureUsageEvents += 1;
      const feature = featureName(event);
      if (feature) features.set(feature, (features.get(feature) ?? 0) + 1);
    }
    if (type.includes("checkout")) checkoutIntentEvents += 1;
    if (type.includes("pricing")) pricingViewedEvents += 1;
    if (type.includes("invite")) inviteEvents += 1;
  }

  return {
    productEvents: productEvents.length,
    uniqueUsers: users.size,
    signups,
    activations,
    featureUsageEvents,
    checkoutIntentEvents,
    pricingViewedEvents,
    inviteEvents,
    topFeatures: topCounts(features),
    topUsers: topCounts(users).map((item) => ({ id: item.name, count: item.count })),
  };
}

export function computeRevenueMetrics(events: EventRecord[]): RevenueMetrics {
  const revenueEvents = events.filter(isRevenueEvent);
  const grossRevenueAmount: Record<string, number> = {};
  const refundAmount: Record<string, number> = {};
  const netRevenueAmount: Record<string, number> = {};

  let paymentsSucceeded = 0;
  let paymentsFailed = 0;
  let invoicesPaid = 0;
  let subscriptionsCreated = 0;
  let subscriptionsCanceled = 0;
  let refunds = 0;

  for (const event of revenueEvents) {
    const type = event.type;
    if (
      type === "stripe.payment_intent.succeeded" ||
      type === "stripe.invoice.paid" ||
      type === "stripe.checkout.session.completed"
    ) {
      paymentsSucceeded += 1;
      if (type === "stripe.invoice.paid") invoicesPaid += 1;
      const parsed = stripeAmount(event);
      if (parsed) {
        addCurrencyAmount(grossRevenueAmount, parsed.currency, parsed.amount);
        addCurrencyAmount(netRevenueAmount, parsed.currency, parsed.amount);
      }
    }
    if (
      type === "stripe.payment_intent.payment_failed" ||
      type === "stripe.invoice.payment_failed"
    ) {
      paymentsFailed += 1;
    }
    if (type === "stripe.customer.subscription.created") subscriptionsCreated += 1;
    if (type === "stripe.customer.subscription.deleted") subscriptionsCanceled += 1;
    if (type === "stripe.charge.refunded") {
      refunds += 1;
      const parsed = stripeAmount(event);
      if (parsed) {
        addCurrencyAmount(refundAmount, parsed.currency, parsed.amount);
        addCurrencyAmount(netRevenueAmount, parsed.currency, -parsed.amount);
      }
    }
  }

  return {
    paymentsSucceeded,
    paymentsFailed,
    invoicesPaid,
    subscriptionsCreated,
    subscriptionsCanceled,
    refunds,
    grossRevenueAmount,
    refundAmount,
    netRevenueAmount,
  };
}

export function computeEngineeringMetrics(
  events: EventRecord[],
  workstreams: WorkstreamRecord[],
): EngineeringMetrics {
  let agentEvents = 0;
  let codeChangeEvents = 0;
  let githubEvents = 0;
  let cliEvents = 0;
  let watcherEvents = 0;
  let prOpened = 0;
  let prMerged = 0;
  let commandsPassed = 0;
  let commandsFailed = 0;

  for (const event of events) {
    if (event.source === "cursor" || event.category === "agent_action") agentEvents += 1;
    if (event.category === "code_change") codeChangeEvents += 1;
    if (event.source === "github") githubEvents += 1;
    if (event.source === "cli") cliEvents += 1;
    if (event.source === "watcher") watcherEvents += 1;
    if (event.type === "github.pull_request.opened") prOpened += 1;
    if (event.type === "github.pull_request.merged") prMerged += 1;
    if (event.type.includes("command.passed") || event.type.includes("build.passed")) {
      commandsPassed += 1;
    }
    if (event.type.includes("command.failed") || event.type.includes("build.failed")) {
      commandsFailed += 1;
    }
  }

  return {
    agentEvents,
    codeChangeEvents,
    githubEvents,
    cliEvents,
    watcherEvents,
    prOpened,
    prMerged,
    commandsPassed,
    commandsFailed,
    workstreamsStarted: workstreams.filter((ws) => ws.status !== "archived").length,
    workstreamsCompleted: workstreams.filter((ws) => ws.status === "completed").length,
  };
}

export function computeDecisionMetrics(events: EventRecord[]): DecisionMetrics {
  const decisions = events.filter((event) => event.category === "company_decision");
  const entityKeys = new Set<string>();
  const keywords = new Set<string>();

  for (const event of decisions) {
    if (event.entity?.name) entityKeys.add(event.entity.name);
    if (event.entity?.id) entityKeys.add(event.entity.id);
    const words = event.title
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4);
    for (const word of words.slice(0, 3)) keywords.add(word);
  }

  return {
    decisionsMade: decisions.length,
    linkedEntityCount: entityKeys.size,
    keywords: [...keywords].slice(0, 10),
  };
}

export function computeMetricsBundle(
  events: EventRecord[],
  workstreams: WorkstreamRecord[] = [],
): ImpactMetricsBundle {
  return {
    product: computeProductMetrics(events),
    revenue: computeRevenueMetrics(events),
    engineering: computeEngineeringMetrics(events, workstreams),
    decisions: computeDecisionMetrics(events),
  };
}

function deltaNumber(baseline: number, impact: number): number {
  return impact - baseline;
}

function deltaPercentage(baseline: number, impact: number): number | null {
  if (baseline === 0) return null;
  return ((impact - baseline) / baseline) * 100;
}

function deltaCurrencyRecords(
  baseline: Record<string, number>,
  impact: Record<string, number>,
): Record<string, number> {
  const currencies = new Set([...Object.keys(baseline), ...Object.keys(impact)]);
  const delta: Record<string, number> = {};
  for (const currency of currencies) {
    delta[currency] = (impact[currency] ?? 0) - (baseline[currency] ?? 0);
  }
  return delta;
}

export type ImpactMetricsResult = {
  baseline: ImpactMetricsBundle;
  impact: ImpactMetricsBundle;
  delta: {
    product: Record<string, number | null>;
    revenue: Record<string, number | Record<string, number> | null>;
    engineering: Record<string, number | null>;
    decisions: Record<string, number | string[] | null>;
  };
};

export function computeMetricsWithDelta(
  baselineEvents: EventRecord[],
  impactEvents: EventRecord[],
  baselineWorkstreams: WorkstreamRecord[] = [],
  impactWorkstreams: WorkstreamRecord[] = [],
): ImpactMetricsResult {
  const baseline = computeMetricsBundle(baselineEvents, baselineWorkstreams);
  const impact = computeMetricsBundle(impactEvents, impactWorkstreams);

  const productDelta: Record<string, number | null> = {};
  for (const key of Object.keys(baseline.product) as Array<keyof ProductMetrics>) {
    const bVal = baseline.product[key];
    const iVal = impact.product[key];
    if (typeof bVal === "number" && typeof iVal === "number") {
      productDelta[key] = deltaNumber(bVal, iVal);
    }
  }

  const engineeringDelta: Record<string, number | null> = {};
  for (const key of Object.keys(baseline.engineering) as Array<keyof EngineeringMetrics>) {
    engineeringDelta[key] = deltaNumber(baseline.engineering[key], impact.engineering[key]);
  }

  const revenueDelta: Record<string, number | Record<string, number> | null> = {
    paymentsSucceeded: deltaNumber(baseline.revenue.paymentsSucceeded, impact.revenue.paymentsSucceeded),
    paymentsFailed: deltaNumber(baseline.revenue.paymentsFailed, impact.revenue.paymentsFailed),
    invoicesPaid: deltaNumber(baseline.revenue.invoicesPaid, impact.revenue.invoicesPaid),
    subscriptionsCreated: deltaNumber(
      baseline.revenue.subscriptionsCreated,
      impact.revenue.subscriptionsCreated,
    ),
    subscriptionsCanceled: deltaNumber(
      baseline.revenue.subscriptionsCanceled,
      impact.revenue.subscriptionsCanceled,
    ),
    refunds: deltaNumber(baseline.revenue.refunds, impact.revenue.refunds),
    grossRevenueAmount: deltaCurrencyRecords(
      baseline.revenue.grossRevenueAmount,
      impact.revenue.grossRevenueAmount,
    ),
    refundAmount: deltaCurrencyRecords(
      baseline.revenue.refundAmount,
      impact.revenue.refundAmount,
    ),
    netRevenueAmount: deltaCurrencyRecords(
      baseline.revenue.netRevenueAmount,
      impact.revenue.netRevenueAmount,
    ),
  };

  const decisionsDelta: Record<string, number | string[] | null> = {
    decisionsMade: deltaNumber(baseline.decisions.decisionsMade, impact.decisions.decisionsMade),
    linkedEntityCount: deltaNumber(
      baseline.decisions.linkedEntityCount,
      impact.decisions.linkedEntityCount,
    ),
    keywords: impact.decisions.keywords,
  };

  return {
    baseline,
    impact,
    delta: {
      product: productDelta,
      revenue: revenueDelta,
      engineering: engineeringDelta,
      decisions: decisionsDelta,
    },
  };
}

export function percentageChange(baseline: number, impact: number): number | null {
  return deltaPercentage(baseline, impact);
}

export function takeEventIds(events: EventRecord[], limit = 5): Id<"events">[] {
  return events.slice(0, limit).map((event) => event.id as Id<"events">);
}
