"use client";

import type { WhyFeatureId } from "@/components/landing/why-sortiri/features";
import { AgentContextDiagram } from "@/components/landing/why-sortiri/diagrams/agent-context-diagram";
import { AuditsDiagram } from "@/components/landing/why-sortiri/diagrams/audits-diagram";
import { EnterpriseDiagramPanel } from "@/components/landing/why-sortiri/diagrams/enterprise-diagram";
import { ImpactDiagram } from "@/components/landing/why-sortiri/diagrams/impact-diagram";
import { PrivateEvalsDiagram } from "@/components/landing/why-sortiri/diagrams/private-evals-diagram";
import { ReplayDiagram } from "@/components/landing/why-sortiri/diagrams/replay-diagram";
import { TimelineDiagram } from "@/components/landing/why-sortiri/diagrams/timeline-diagram";

type FeatureDiagramPanelProps = {
  featureId: WhyFeatureId;
  className?: string;
};

export function FeatureDiagramPanel({
  featureId,
  className = "",
}: FeatureDiagramPanelProps) {
  return (
    <div
      id={`why-feature-panel-${featureId}`}
      role="tabpanel"
      aria-labelledby={`why-feature-tab-${featureId}`}
      className={`why-sortiri__diagram-panel ${className}`.trim()}
    >
      {featureId === "timeline" ? <TimelineDiagram /> : null}
      {featureId === "replay" ? <ReplayDiagram /> : null}
      {featureId === "impact" ? <ImpactDiagram /> : null}
      {featureId === "agent-context" ? <AgentContextDiagram /> : null}
      {featureId === "enterprise" ? <EnterpriseDiagramPanel /> : null}
      {featureId === "audits" ? <AuditsDiagram /> : null}
      {featureId === "private-evals" ? <PrivateEvalsDiagram /> : null}
    </div>
  );
}
