import type { ConfidenceLabel } from "@/types/event-links";

export function getConfidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= 0.85) return "Strong";
  if (confidence >= 0.6) return "Likely";
  return "Possible";
}

export function getConfidenceClassName(confidence: number): string {
  const label = getConfidenceLabel(confidence);
  return `related-history__confidence related-history__confidence--${label.toLowerCase()}`;
}
