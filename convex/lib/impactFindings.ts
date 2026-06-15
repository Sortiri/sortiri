import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { listLinksForEvent } from "./eventLinksLib";
import type { EventRecord } from "./eventsLib";
import type { ImpactFindingInput } from "./impactAnalysesLib";
import {
  computeMetricsBundle,
  takeEventIds,
  type ImpactMetricsBundle,
  type ImpactMetricsResult,
} from "./impactMetrics";

type DbReadCtx = Pick<QueryCtx, "db">;

const CAUSATION_WORDS = /\b(caused|definitely|proved|proves|prove)\b/i;

export function assertCautiousCopy(text: string): boolean {
  return !CAUSATION_WORDS.test(text);
}

function deltaUp(baseline: number, impact: number): boolean {
  return impact > baseline;
}

function appearedAfter(baseline: number, impact: number): boolean {
  return baseline === 0 && impact > 0;
}

function addFinding(
  findings: ImpactFindingInput[],
  finding: ImpactFindingInput,
): void {
  if (!assertCautiousCopy(finding.summary) || !assertCautiousCopy(finding.title)) {
    throw new Error("Impact finding copy must use cautious language");
  }
  findings.push(finding);
}

export function generateImpactFindings(
  metrics: ImpactMetricsResult,
  baselineEvents: EventRecord[],
  impactEvents: EventRecord[],
): ImpactFindingInput[] {
  const findings: ImpactFindingInput[] = [];
  const { baseline, impact, delta } = metrics;

  const productDelta = delta.product.productEvents as number | null | undefined;
  if (
    typeof productDelta === "number" &&
    (deltaUp(baseline.product.productEvents, impact.product.productEvents) ||
      appearedAfter(baseline.product.productEvents, impact.product.productEvents))
  ) {
    addFinding(findings, {
      type: "product_movement",
      severity: "info",
      confidence: "possible",
      title: "Product activity may have increased",
      summary:
        baseline.product.productEvents === 0
          ? `${impact.product.productEvents} product event${impact.product.productEvents === 1 ? "" : "s"} appeared in the impact window.`
          : `Product events increased from ${baseline.product.productEvents} to ${impact.product.productEvents} in the impact window — possibly related to the anchor change.`,
      evidenceEventIds: takeEventIds(
        impactEvents.filter((e) => e.category === "product_event"),
      ),
      metrics: { baseline: baseline.product.productEvents, impact: impact.product.productEvents },
    });
  }

  if (
    deltaUp(baseline.product.signups, impact.product.signups) ||
    appearedAfter(baseline.product.signups, impact.product.signups)
  ) {
    addFinding(findings, {
      type: "product_movement",
      severity: "info",
      confidence: "possible",
      title: "Signups may have increased",
      summary:
        baseline.product.signups === 0
          ? `${impact.product.signups} signup${impact.product.signups === 1 ? "" : "s"} appeared in the impact window.`
          : `Signups went from ${baseline.product.signups} to ${impact.product.signups} in the impact window.`,
      evidenceEventIds: takeEventIds(
        impactEvents.filter((e) => /signed_up|signup|sign_up/i.test(e.type)),
      ),
    });
  }

  if (
    deltaUp(baseline.product.activations, impact.product.activations) ||
    appearedAfter(baseline.product.activations, impact.product.activations)
  ) {
    addFinding(findings, {
      type: "activation_movement",
      severity: "info",
      confidence: "possible",
      title: "Activation activity in the impact window",
      summary:
        baseline.product.activations === 0
          ? `${impact.product.activations} activation event${impact.product.activations === 1 ? "" : "s"} appeared after the anchor.`
          : `Activations increased from ${baseline.product.activations} to ${impact.product.activations} in the impact window.`,
      evidenceEventIds: takeEventIds(
        impactEvents.filter((e) => /activation|onboarding_completed/i.test(e.type)),
      ),
    });
  }

  if (
    deltaUp(baseline.product.featureUsageEvents, impact.product.featureUsageEvents) ||
    appearedAfter(baseline.product.featureUsageEvents, impact.product.featureUsageEvents)
  ) {
    const confidence =
      impact.product.featureUsageEvents >= baseline.product.featureUsageEvents + 3
        ? "likely"
        : "possible";
    addFinding(findings, {
      type: "feature_usage",
      severity: "info",
      confidence,
      title: "Feature usage may have shifted",
      summary: `Feature usage events in the impact window (${impact.product.featureUsageEvents}) differ from baseline (${baseline.product.featureUsageEvents}). This may be related to the anchor change.`,
      evidenceEventIds: takeEventIds(
        impactEvents.filter((e) => e.category === "product_event"),
      ),
      metrics: { topFeatures: impact.product.topFeatures },
    });
  }

  if (
    deltaUp(baseline.revenue.paymentsSucceeded, impact.revenue.paymentsSucceeded) ||
    appearedAfter(baseline.revenue.paymentsSucceeded, impact.revenue.paymentsSucceeded)
  ) {
    addFinding(findings, {
      type: "revenue_movement",
      severity: "info",
      confidence: "possible",
      title: "Revenue events in the impact window",
      summary: `${impact.revenue.paymentsSucceeded} successful payment${impact.revenue.paymentsSucceeded === 1 ? "" : "s"} in the impact window vs ${baseline.revenue.paymentsSucceeded} in baseline — possibly related timing.`,
      evidenceEventIds: takeEventIds(
        impactEvents.filter(
          (e) =>
            e.category === "revenue_event" &&
            (e.type.includes("succeeded") || e.type.includes("paid") || e.type.includes("completed")),
        ),
      ),
    });
  }

  if (
    deltaUp(baseline.revenue.paymentsFailed, impact.revenue.paymentsFailed) ||
    deltaUp(baseline.revenue.refunds, impact.revenue.refunds) ||
    deltaUp(baseline.revenue.subscriptionsCanceled, impact.revenue.subscriptionsCanceled)
  ) {
    addFinding(findings, {
      type: "negative_signal",
      severity: "warning",
      confidence: "possible",
      title: "Negative revenue signals in the impact window",
      summary: `Payment failures, refunds, or cancellations increased in the impact window compared to baseline. Review whether these are expected.`,
      evidenceEventIds: takeEventIds(
        impactEvents.filter(
          (e) =>
            e.source === "stripe" &&
            (e.type.includes("failed") ||
              e.type.includes("refunded") ||
              e.type.includes("subscription.deleted")),
        ),
      ),
    });
  }

  const customerEvents = impactEvents.filter(
    (e) => e.entity?.type === "customer" || e.actor.type === "customer",
  );
  if (customerEvents.length > 0) {
    addFinding(findings, {
      type: "customer_activity",
      severity: "info",
      confidence: "possible",
      title: "Customer activity in the impact window",
      summary: `${customerEvents.length} customer-related event${customerEvents.length === 1 ? "" : "s"} occurred in the impact window.`,
      evidenceEventIds: takeEventIds(customerEvents),
    });
  }

  const paymentEvents = impactEvents.filter((e) => e.entity?.type === "payment");
  if (paymentEvents.length > 0) {
    addFinding(findings, {
      type: "payment_activity",
      severity: "info",
      confidence: "possible",
      title: "Payment activity in the impact window",
      summary: `${paymentEvents.length} payment event${paymentEvents.length === 1 ? "" : "s"} recorded in the impact window.`,
      evidenceEventIds: takeEventIds(paymentEvents),
    });
  }

  return findings.slice(0, 15);
}

export async function addRelatedWorkFindings(
  ctx: DbReadCtx,
  findings: ImpactFindingInput[],
  anchorEventIds: Id<"events">[],
): Promise<void> {
  const workstreamIds = new Set<Id<"workstreams">>();
  const relatedEventIds: Id<"events">[] = [];

  for (const eventId of anchorEventIds) {
    const links = await listLinksForEvent(ctx, eventId, 5);
    for (const item of links) {
      if (item.link.type === "led_to" || item.link.type === "related") {
        if (item.relatedEvent) {
          relatedEventIds.push(item.relatedEvent.id as Id<"events">);
        }
        if (item.link.toWorkstreamId) {
          workstreamIds.add(item.link.toWorkstreamId as Id<"workstreams">);
        }
        if (item.link.fromWorkstreamId) {
          workstreamIds.add(item.link.fromWorkstreamId as Id<"workstreams">);
        }
      }
    }
  }

  if (relatedEventIds.length === 0 && workstreamIds.size === 0) return;

  addFinding(findings, {
    type: "related_work",
    severity: "info",
    confidence: "possible",
    title: "Related work near the anchor",
    summary:
      "Events or workstreams linked to the anchor may be related to activity in the impact window. Correlation only — not causation.",
    evidenceEventIds: relatedEventIds.slice(0, 5),
    evidenceWorkstreamIds: [...workstreamIds].slice(0, 5),
  });
}

export function generateAllImpactFindings(
  metrics: ImpactMetricsResult,
  baselineEvents: EventRecord[],
  impactEvents: EventRecord[],
): ImpactFindingInput[] {
  return generateImpactFindings(metrics, baselineEvents, impactEvents);
}
