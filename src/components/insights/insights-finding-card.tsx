"use client";

import type { InsightFindingDetail } from "@/types/insights";
import { InsightsEvidence } from "@/components/insights/insights-evidence";
import { EntityFindingLink } from "@/components/insights/entity-finding-link";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { EntityType } from "@/types/events";
import "./insights.css";

const TYPE_LABELS: Record<string, string> = {
  hotspot: "Hotspot",
  risk: "Risk",
  duplicate_work: "Duplicate Work",
  error: "Error",
  stale_workstream: "Stale Workstream",
  product_movement: "Product Movement",
  decision: "Decision",
  summary: "Summary",
  other: "Other",
};

type InsightsFindingCardProps = {
  finding: InsightFindingDetail;
};

export function InsightsFindingCard({ finding }: InsightsFindingCardProps) {
  const { activeWorkspaceId } = useWorkspace();
  const typeLabel = TYPE_LABELS[finding.type] ?? finding.type;
  const findingData = finding.data as
    | { entityType?: EntityType; entityKey?: string }
    | undefined;

  return (
    <article className="insights-finding-card">
      <div className="insights-finding-card__header">
        <span
          className={`insights-finding-card__severity insights-finding-card__severity--${finding.severity}`}
        >
          {finding.severity}
        </span>
        <p className="insights-finding-card__type">{typeLabel}</p>
      </div>
      <h3 className="insights-finding-card__title">{finding.title}</h3>
      <p className="insights-finding-card__summary">{finding.summary}</p>
      {finding.recommendation ? (
        <p className="insights-finding-card__recommendation">
          Recommendation: {finding.recommendation}
        </p>
      ) : null}
      {activeWorkspaceId &&
      findingData?.entityType &&
      findingData?.entityKey ? (
        <EntityFindingLink
          workspaceId={activeWorkspaceId}
          entityType={findingData.entityType}
          entityKey={findingData.entityKey}
        />
      ) : null}
      <InsightsEvidence
        events={finding.evidence.events}
        workstreams={finding.evidence.workstreams}
        relatedEvents={finding.evidence.relatedEvents}
      />
    </article>
  );
}
