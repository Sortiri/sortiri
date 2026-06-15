import type { Doc } from "../_generated/dataModel";
import type { InsightFindingRecord } from "./insightRunsLib";
import type { ImpactFindingRecord } from "./impactAnalysesLib";
import type { KnownFailureItem } from "./knownFailures";
import type { SourceHealthEntry } from "../integrations/health";

export type RecommendationPriority = Doc<"recommendations">["priority"];

export function priorityFromInsightFinding(finding: InsightFindingRecord): RecommendationPriority {
  if (finding.type === "sensitive_evidence" || finding.severity === "critical") {
    return "critical";
  }
  if (finding.type === "error" || finding.severity === "warning") {
    return "high";
  }
  if (finding.type === "impact_opportunity" || finding.type === "lesson_opportunity") {
    return "normal";
  }
  if (finding.type === "stale_workstream" || finding.type === "duplicate_work") {
    return "low";
  }
  return "normal";
}

export function priorityFromImpactFinding(finding: ImpactFindingRecord): RecommendationPriority {
  if (finding.type === "negative_signal" || finding.type === "risk") {
    return finding.severity === "critical" ? "critical" : "high";
  }
  if (finding.type === "payment_activity" && finding.severity === "warning") {
    return "high";
  }
  if (finding.type === "revenue_movement" && finding.severity === "warning") {
    return "high";
  }
  return "normal";
}

export function priorityFromKnownFailure(item: KnownFailureItem): RecommendationPriority {
  if (
    item.failureType.includes("audit") ||
    item.failureType.includes("permission") ||
    item.failureType.includes("secret")
  ) {
    return "critical";
  }
  if (item.count >= 5) return "high";
  if (item.count >= 3) return "high";
  return "normal";
}

export function priorityFromSourceHealth(entry: SourceHealthEntry): RecommendationPriority {
  if (entry.status === "error") {
    if (entry.source === "stripe") return "critical";
    return "high";
  }
  if (entry.status === "not_connected" && ["stripe", "posthog", "github"].includes(entry.source)) {
    return "normal";
  }
  return "low";
}

export function priorityFromEventType(eventType: string, source: string): RecommendationPriority {
  if (/payment_failed|refund|chargeback|cancellation/i.test(eventType)) {
    return "critical";
  }
  if (/webhook.*fail|signature/i.test(eventType)) {
    return "high";
  }
  if (/command\.failed|build\.failed/i.test(eventType)) {
    return "high";
  }
  if (source === "posthog" && /signup|activation/i.test(eventType)) {
    return "normal";
  }
  return "low";
}

export function confidenceFromSeverity(
  severity?: string,
): Doc<"recommendations">["confidence"] {
  if (severity === "critical") return "strong";
  if (severity === "warning") return "likely";
  return "possible";
}
