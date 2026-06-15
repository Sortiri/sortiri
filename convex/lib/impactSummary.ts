import type { ImpactFindingInput } from "./impactAnalysesLib";
import { assertCautiousCopy } from "./impactFindings";
import type { ImpactMetricsResult } from "./impactMetrics";
import { formatWindowLabel } from "./impactWindows";

export function buildDeterministicImpactSummary(input: {
  anchorTitle: string;
  beforeMs: number;
  afterMs: number;
  metrics: ImpactMetricsResult;
  findings: ImpactFindingInput[];
  truncated?: boolean;
}): string {
  const windowLabel = formatWindowLabel(input.beforeMs, input.afterMs);
  const topFindings = input.findings.slice(0, 3);

  const lines: string[] = [
    `Impact analysis for "${input.anchorTitle}" (${windowLabel}).`,
    "This summary describes activity before and after the anchor time. Correlation only — not causation.",
    "",
  ];

  const { baseline, impact } = input.metrics;
  lines.push(
    `Product: ${baseline.product.productEvents} events in baseline vs ${impact.product.productEvents} in impact window.`,
    `Revenue: ${baseline.revenue.paymentsSucceeded} successful payments in baseline vs ${impact.revenue.paymentsSucceeded} in impact window.`,
    `Engineering: ${baseline.engineering.codeChangeEvents} code changes in baseline vs ${impact.engineering.codeChangeEvents} in impact window.`,
  );

  if (topFindings.length > 0) {
    lines.push("", "Notable patterns (possibly related):");
    for (const finding of topFindings) {
      lines.push(`- ${finding.title}: ${finding.summary}`);
    }
  }

  if (input.truncated) {
    lines.push(
      "",
      "Note: event scan limit was reached; metrics may be incomplete for large workspaces.",
    );
  }

  const summary = lines.join("\n");
  if (!assertCautiousCopy(summary)) {
    throw new Error("Impact summary must use cautious language");
  }
  return summary;
}
