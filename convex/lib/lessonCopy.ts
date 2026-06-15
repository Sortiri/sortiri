import { assertCautiousCopy } from "./impactFindings";
import type { Doc } from "../_generated/dataModel";
import type { ImpactFindingRecord } from "./impactAnalysesLib";

export function assertLessonCopy(text: string): boolean {
  return assertCautiousCopy(text);
}

export function buildLessonTitleFromFinding(finding: ImpactFindingRecord): string {
  const prefix: Record<Doc<"impactFindings">["type"], string> = {
    product_movement: "Product pattern observed",
    revenue_movement: "Revenue pattern observed",
    activation_movement: "Activation pattern observed",
    feature_usage: "Feature usage pattern",
    customer_activity: "Customer activity pattern",
    payment_activity: "Payment activity pattern",
    negative_signal: "Negative signal noted",
    related_work: "Related work pattern",
    risk: "Risk signal noted",
    other: "Pattern noted",
  };
  return prefix[finding.type] ?? "Pattern noted";
}

export function buildLessonSummaryFromFinding(finding: ImpactFindingRecord): string {
  return finding.summary;
}

export function buildLessonRecommendationFromFinding(
  finding: ImpactFindingRecord,
): string {
  const recommendations: Record<Doc<"impactFindings">["type"], string> = {
    product_movement:
      "Review product metrics around this window and consider whether similar changes may correlate with movement again.",
    revenue_movement:
      "Monitor revenue metrics after similar changes and document what was different in this window.",
    activation_movement:
      "Track activation metrics for comparable releases and note which onboarding paths were active.",
    feature_usage:
      "Compare feature usage before and after similar work and capture what teams shipped nearby.",
    customer_activity:
      "Watch customer activity signals after comparable changes and record context for future reviews.",
    payment_activity:
      "Review payment activity around similar windows and note billing or checkout changes nearby.",
    negative_signal:
      "Investigate nearby engineering, product, and integration events; run validation scripts before retrying.",
    related_work:
      "Coordinate with teams on related workstreams and align validation before overlapping releases.",
    risk:
      "Treat this as a risk signal — review evidence, run targeted validation, and document mitigations.",
    other: "Review linked evidence and capture what may be worth repeating or avoiding.",
  };
  return recommendations[finding.type] ?? recommendations.other;
}

export function buildValidationLessonCopy(input: {
  failureType: string;
  count: number;
  windowDays: number;
}): { title: string; summary: string; recommendation: string } {
  const title = `Repeated ${input.failureType} failures detected`;
  const summary = `${input.count} similar ${input.failureType} events appeared in the last ${input.windowDays} days. This may indicate a recurring validation or integration issue.`;
  const recommendation =
    "Run webhook and build validation scripts before deploying. Review recent integration changes and confirm secrets and signatures are configured correctly.";
  return { title, summary, recommendation };
}

export function buildSecurityLessonCopy(): {
  title: string;
  summary: string;
  recommendation: string;
} {
  return {
    title: "Blocked or unsafe evidence detected",
    summary:
      "Some evidence in this scope was blocked or marked unsafe for audit. Sensitive content may need redaction before sharing.",
    recommendation:
      "Review evidence safety settings, redact sensitive artifacts, and confirm permissions before exporting audit packages.",
  };
}

export function validateLessonCopy(parts: {
  title: string;
  summary: string;
  recommendation?: string;
}): void {
  if (!assertLessonCopy(parts.title) || !assertLessonCopy(parts.summary)) {
    throw new Error("Lesson copy must use cautious language");
  }
  if (parts.recommendation && !assertLessonCopy(parts.recommendation)) {
    throw new Error("Lesson recommendation must use cautious language");
  }
}
