"use client";

import type { UseCaseId } from "@/components/landing/use-cases/use-cases";
import { AgentFleetDiagram } from "@/components/landing/use-cases/diagrams/agent-fleet-diagram";
import { AuditEvidenceDiagram } from "@/components/landing/use-cases/diagrams/audit-evidence-diagram";
import { IncidentReplayDiagram } from "@/components/landing/use-cases/diagrams/incident-replay-diagram";
import { PrivateEvalsDiagram } from "@/components/landing/use-cases/diagrams/private-evals-diagram";
import { ProductImpactDiagram } from "@/components/landing/use-cases/diagrams/product-impact-diagram";
import { SpendControlDiagram } from "@/components/landing/use-cases/diagrams/spend-control-diagram";

type UseCaseDiagramPanelProps = {
  useCaseId: UseCaseId;
  className?: string;
};

export function UseCaseDiagramPanel({
  useCaseId,
  className = "",
}: UseCaseDiagramPanelProps) {
  return (
    <div
      id={`use-case-panel-${useCaseId}`}
      role="tabpanel"
      aria-labelledby={`use-case-tab-${useCaseId}`}
      className={`use-cases__diagram-panel ${className}`.trim()}
    >
      {useCaseId === "agent-fleet-visibility" ? <AgentFleetDiagram /> : null}
      {useCaseId === "incident-rollback-replay" ? <IncidentReplayDiagram /> : null}
      {useCaseId === "product-impact-analysis" ? <ProductImpactDiagram /> : null}
      {useCaseId === "audit-evidence-rooms" ? <AuditEvidenceDiagram /> : null}
      {useCaseId === "private-model-evals" ? <PrivateEvalsDiagram /> : null}
      {useCaseId === "enterprise-spend-control" ? <SpendControlDiagram /> : null}
    </div>
  );
}
