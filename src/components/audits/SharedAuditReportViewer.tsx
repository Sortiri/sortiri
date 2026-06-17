"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { ShareableEventExport, ShareableReportExportInput } from "@/types/audit-sharing";
import { EXPORT_SAFETY_NOTICE } from "@/types/audit-sharing";
import { PageLoader } from "@/components/ui/page-loader";
import type { AuditReportItemRecord } from "@/types/audit-reports";
import "@/components/audits/audits.css";
import "@/components/security/security.css";

type SharedAuditReportViewerProps = {
  token: string;
  payload: ShareableReportExportInput;
  shareLinkId: string;
};

function formatDate(ms?: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

function SensitivityBadge({
  redactionStatus,
  sensitivity,
}: {
  redactionStatus?: string;
  sensitivity?: string;
}) {
  if (redactionStatus === "redacted" || redactionStatus === "needs_review") {
    return (
      <span className={`evidence-badge evidence-badge--${redactionStatus}`}>
        {redactionStatus === "redacted" ? "Redacted" : "Reviewed"}
      </span>
    );
  }
  if (sensitivity && sensitivity !== "public" && sensitivity !== "internal") {
    return <span className="evidence-badge evidence-badge--sensitive">{sensitivity}</span>;
  }
  return null;
}

export function SharedAuditReportViewer({
  token,
  payload,
  shareLinkId,
}: SharedAuditReportViewerProps) {
  const markAccessed = useMutation(api.auditSharing.markShareAccessed);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [expandedWorkstreamId, setExpandedWorkstreamId] = useState<string | null>(null);

  const workstreamEvents = useQuery(
    api.auditSharing.listShareableWorkstreamEvents,
    expandedWorkstreamId
      ? { token, workstreamId: expandedWorkstreamId as never }
      : "skip",
  );

  useEffect(() => {
    void markAccessed({
      shareLinkId: shareLinkId as never,
      token,
    });
  }, [markAccessed, shareLinkId, token]);

  const openArtifact = useCallback(
    async (artifactId: string) => {
      setSelectedArtifactId(artifactId);
      setArtifactLoading(true);
      setArtifactContent(null);
      try {
        const response = await fetch(`/api/share/audit/${token}/artifacts/${artifactId}`);
        if (!response.ok) {
          setArtifactContent("Artifact not available.");
          return;
        }
        const data = (await response.json()) as { content?: string; title?: string };
        setArtifactContent(data.content ?? "(No content)");
      } catch {
        setArtifactContent("Could not load artifact.");
      } finally {
        setArtifactLoading(false);
      }
    },
    [token],
  );

  const items = payload.items as AuditReportItemRecord[];
  const { report, evidence, safety } = payload;

  return (
    <div className="shared-audit-page">
      <header className="shared-audit-page__header">
        <p className="shared-audit-page__brand">Sortiri Audit Report</p>
        <span className="audit-status audit-status--finalized">finalized</span>
        <h1 className="audits-page__title">{report.title}</h1>
        {report.generatedSummary ? (
          <p className="audit-detail__summary">{report.generatedSummary}</p>
        ) : null}
        <p className="audit-detail__summary">
          Finalized: {formatDate(report.finalizedAt)}
        </p>
      </header>

      <section className="audit-safety-summary">
        <h2 className="evidence-review-section__title">Evidence overview</h2>
        <div className="audit-safety-summary__grid">
          <div className="audit-safety-summary__stat">
            <strong>{evidence.events.length}</strong>
            Events
          </div>
          <div className="audit-safety-summary__stat">
            <strong>{evidence.workstreams.length}</strong>
            Workstreams
          </div>
          <div className="audit-safety-summary__stat">
            <strong>{evidence.artifacts.length}</strong>
            Artifacts
          </div>
          <div className="audit-safety-summary__stat">
            <strong>{evidence.entities.length}</strong>
            Entities
          </div>
          <div className="audit-safety-summary__stat">
            <strong>{evidence.insights.length}</strong>
            Insights
          </div>
          <div className="audit-safety-summary__stat">
            <strong>{safety.redactedEvidenceCount}</strong>
            Redacted
          </div>
        </div>
        <p className="audit-safety-summary__banner">{EXPORT_SAFETY_NOTICE}</p>
      </section>

      <section className="audit-export-section">
        <h2 className="evidence-review-section__title">Export</h2>
        <div className="audit-export-section__actions">
          <a
            className="audit-detail__action"
            href={`/api/share/audit/${token}/export/markdown`}
          >
            Download Markdown
          </a>
          <a className="audit-detail__action" href={`/api/share/audit/${token}/export/html`}>
            Download HTML
          </a>
          <a className="audit-detail__action" href={`/api/share/audit/${token}/export/json`}>
            Download JSON Manifest
          </a>
        </div>
      </section>

      <section className="audit-evidence-groups">
        <h2 className="evidence-review-section__title">Evidence</h2>
        {items.map((item) => (
          <article key={item.id} className="audit-evidence-item">
            <p className="audit-evidence-item__title">
              {item.itemType}: {item.title}
            </p>
            {item.summary ? (
              <p className="audit-evidence-item__summary">{item.summary}</p>
            ) : null}
            {item.reason ? (
              <p className="audit-evidence-item__reason">{item.reason}</p>
            ) : null}
            {item.artifactId ? (
              <>
                <SensitivityBadge
                  redactionStatus={evidence.artifacts.find((a) => a.id === item.artifactId)?.redactionStatus}
                  sensitivity={evidence.artifacts.find((a) => a.id === item.artifactId)?.sensitivity}
                />
                <button
                  type="button"
                  className="audit-evidence-item__link"
                  onClick={() => void openArtifact(item.artifactId!)}
                >
                  Open artifact
                </button>
              </>
            ) : null}
            {item.workstreamId ? (
              <button
                type="button"
                className="audit-evidence-item__link"
                onClick={() =>
                  setExpandedWorkstreamId((current) =>
                    current === item.workstreamId ? null : item.workstreamId!,
                  )
                }
              >
                {expandedWorkstreamId === item.workstreamId
                  ? "Hide workstream replay"
                  : "Show workstream replay"}
              </button>
            ) : null}
            {expandedWorkstreamId === item.workstreamId && workstreamEvents ? (
              <div className="shared-audit-workstream-events">
                {workstreamEvents.length === 0 ? (
                  <p className="audit-detail__summary">No events in snapshot.</p>
                ) : (
                  workstreamEvents.map((event: ShareableEventExport) => (
                    <div key={event.id} className="audit-evidence-item">
                      <p className="audit-evidence-item__title">{event.title}</p>
                      <p className="audit-evidence-item__reason">
                        {formatDate(event.occurredAt)} · {event.source}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </article>
        ))}
      </section>

      {selectedArtifactId ? (
        <section className="shared-audit-artifact-panel">
          <h2 className="evidence-review-section__title">Artifact preview</h2>
          <button
            type="button"
            className="audit-evidence-item__link"
            onClick={() => setSelectedArtifactId(null)}
          >
            Close
          </button>
          {artifactLoading ? (
            <PageLoader variant="section" />
          ) : (
            <pre className="shared-audit-artifact-content">{artifactContent}</pre>
          )}
        </section>
      ) : null}

      <section className="shared-audit-ask-disabled">
        <p className="audit-detail__summary">
          Ask Sortiri is unavailable on shared links in V1.
        </p>
      </section>
    </div>
  );
}
