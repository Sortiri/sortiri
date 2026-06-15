import { assertCautiousCopy } from "./impactFindings";
import type { Doc } from "../_generated/dataModel";

export function assertRecommendationCopy(text: string): boolean {
  return assertCautiousCopy(text);
}

export function buildRecommendationReasonFromInsight(finding: {
  type: string;
  summary: string;
  recommendation?: string;
}): string {
  if (finding.recommendation?.trim()) return finding.recommendation;
  return `Sortiri noted this signal in recent insights: ${finding.summary}`;
}

export function buildRecommendationReasonFromImpact(finding: {
  type: Doc<"impactFindings">["type"];
  summary: string;
}): string {
  const reasons: Record<Doc<"impactFindings">["type"], string> = {
    product_movement:
      "Product activity may have shifted in the impact window — review linked evidence before acting.",
    revenue_movement:
      "Revenue-related activity may have changed after the anchor — verify payment and checkout signals.",
    activation_movement:
      "Activation signals appeared in the impact window — compare onboarding paths and recent changes.",
    feature_usage:
      "Feature usage may have increased — review what shipped nearby and whether to repeat the pattern.",
    customer_activity:
      "Customer activity signals changed — review linked events and recent product work.",
    payment_activity:
      "Payment activity may have shifted — review billing events and integration health.",
    negative_signal:
      "Negative signals appeared in the impact window — investigate nearby failures and validation gaps.",
    related_work:
      "Related workstreams overlapped this window — coordinate validation before overlapping releases.",
    risk: "A risk signal was recorded — review evidence and run targeted validation.",
    other: "Impact analysis surfaced a pattern worth reviewing.",
  };
  return reasons[finding.type] ?? reasons.other;
}

export function buildFailureRecommendationReason(input: {
  failureType: string;
  count: number;
}): string {
  return `${input.count} similar ${input.failureType} events appeared recently. This may indicate a recurring validation or integration issue.`;
}

export function buildSourceHealthReason(source: string, lastError?: string): string {
  if (lastError?.trim()) {
    return `${source} source health reported an error: ${lastError}`;
  }
  return `${source} integration may need attention — review connection status and recent delivery failures.`;
}

export function buildLessonRecommendationReason(lesson: {
  title: string;
  recommendation?: string;
}): string {
  if (lesson.recommendation?.trim()) return lesson.recommendation;
  return `An active lesson may apply: ${lesson.title}`;
}
