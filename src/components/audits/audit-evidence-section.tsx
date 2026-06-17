"use client";

import Link from "next/link";
import { useArtifactDrawer } from "@/components/artifacts/artifact-context";
import type { AuditReportItemRecord, AuditReportItemType } from "@/types/audit-reports";

const GROUP_LABELS: Record<AuditReportItemType, string> = {
  event: "Events",
  workstream: "Workstreams",
  artifact: "Artifacts",
  entity: "Entities",
  insight: "Insights",
  impact_analysis: "Impact Analysis",
  lesson: "Lessons",
  playbook: "Playbooks",
  decision: "Decisions",
  rollback: "Rollbacks",
  decision_candidate: "Decision Candidates",
  incident: "Incidents",
  observability_signal: "Observability Signals",
  note: "Notes",
};

const GROUP_ORDER: AuditReportItemType[] = [
  "event",
  "workstream",
  "artifact",
  "entity",
  "insight",
  "impact_analysis",
  "lesson",
  "playbook",
  "decision",
  "rollback",
  "decision_candidate",
  "incident",
  "observability_signal",
  "note",
];

type AuditEvidenceSectionProps = {
  items: AuditReportItemRecord[];
  reportId: string;
};

export function AuditEvidenceSection({ items, reportId }: AuditEvidenceSectionProps) {
  const { openArtifact } = useArtifactDrawer();

  const grouped = GROUP_ORDER.map((type) => ({
    type,
    items: items.filter((item) => item.itemType === type),
  })).filter((group) => group.items.length > 0);

  if (items.length === 0) {
    return <p className="audit-detail__summary">No evidence generated yet.</p>;
  }

  return (
    <div className="audit-evidence-groups">
      {grouped.map((group) => (
        <section key={group.type} className="audit-evidence-group">
          <h3 className="audit-evidence-group__title">{GROUP_LABELS[group.type]}</h3>
          {group.items.map((item) => (
            <article key={item.id} className="audit-evidence-item">
              <p className="audit-evidence-item__title">{item.title}</p>
              {item.summary ? (
                <p className="audit-evidence-item__summary">{item.summary}</p>
              ) : null}
              {item.reason ? (
                <p className="audit-evidence-item__reason">{item.reason}</p>
              ) : null}
              {item.artifactId ? (
                <button
                  type="button"
                  className="audit-evidence-item__link"
                  onClick={() => openArtifact(item.artifactId!, reportId)}
                >
                  Open artifact
                </button>
              ) : null}
              {item.workstreamId ? (
                <Link
                  href={`/audits/${reportId}/workstreams/${item.workstreamId}`}
                  className="audit-evidence-item__link"
                >
                  Open workstream replay
                </Link>
              ) : null}
              {item.decisionId ? (
                <Link href={`/decisions/${item.decisionId}`} className="audit-evidence-item__link">
                  Open decision
                </Link>
              ) : null}
              {item.incidentId ? (
                <Link href={`/incidents/${item.incidentId}`} className="audit-evidence-item__link">
                  Open incident
                </Link>
              ) : null}
              {item.observabilitySignalId && item.incidentId ? (
                <Link
                  href={`/incidents/${item.incidentId}`}
                  className="audit-evidence-item__link"
                >
                  Open observability signal
                </Link>
              ) : null}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
