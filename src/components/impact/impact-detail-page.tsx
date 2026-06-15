"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { GeneratePlaybookFromLessonsModal } from "@/components/playbooks/generate-playbook-from-lessons-modal";
import { GenerateContextPackButton } from "@/components/context/generate-context-pack-button";
import type { ImpactAnalysisRecord, ImpactFindingRecord } from "@/types/impact-analysis";
import type { LessonRecord } from "@/types/lessons";
import { formatWindowLabel } from "@/lib/impact-window";
import "./impact.css";

type ImpactDetailPageProps = {
  analysisId: string;
};

type MetricsBundle = {
  product?: Record<string, number | Array<{ name?: string; id?: string; count: number }>>;
  revenue?: Record<string, number | Record<string, number>>;
  engineering?: Record<string, number>;
  decisions?: Record<string, number | string[]>;
};

function renderMetricValue(value: unknown): string {
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return String(value.length);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, number>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ") || "—";
  }
  return "—";
}

function MetricsCard({
  title,
  baseline,
  impact,
}: {
  title: string;
  baseline?: Record<string, unknown>;
  impact?: Record<string, unknown>;
}) {
  const keys = new Set([
    ...Object.keys(baseline ?? {}),
    ...Object.keys(impact ?? {}),
  ]);

  const numericKeys = [...keys].filter((key) => {
    const b = baseline?.[key];
    const i = impact?.[key];
    return typeof b === "number" || typeof i === "number";
  });

  if (numericKeys.length === 0) return null;

  return (
    <div className="impact-metric-card">
      <h3>{title}</h3>
      {numericKeys.slice(0, 8).map((key) => {
        const b = baseline?.[key];
        const i = impact?.[key];
        const bNum = typeof b === "number" ? b : 0;
        const iNum = typeof i === "number" ? i : 0;
        const change = iNum - bNum;
        const changeLabel =
          bNum === 0 && iNum > 0
            ? "appeared after"
            : bNum === 0
              ? "—"
              : `${change >= 0 ? "+" : ""}${change}`;
        return (
          <div key={key} className="impact-metric-row">
            <span>{key}</span>
            <span>
              {bNum} → {iNum} ({changeLabel})
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ImpactDetailPage({ analysisId }: ImpactDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const canManageAudit = capabilities?.canManageAuditReports ?? false;

  const data = useQuery(api.impactAnalyses.getById, {
    analysisId: analysisId as Id<"impactAnalyses">,
  });

  const generateAnalysis = useMutation(api.impactAnalyses.generate);
  const generateLessons = useMutation(api.lessons.generateFromImpactAnalysis);
  const createAudit = useMutation(api.auditReports.create);
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);

  const linkedLessons = useQuery(api.lessons.listByImpactAnalysis, {
    impactAnalysisId: analysisId as Id<"impactAnalyses">,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analysis = data?.analysis as ImpactAnalysisRecord | undefined;
  const findings = (data?.findings ?? []) as ImpactFindingRecord[];

  const handleGenerate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await generateAnalysis({ analysisId: analysisId as Id<"impactAnalyses"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate analysis");
    } finally {
      setBusy(false);
    }
  }, [analysisId, generateAnalysis]);

  const handleGenerateLessons = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await generateLessons({ impactAnalysisId: analysisId as Id<"impactAnalyses"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate lessons");
    } finally {
      setBusy(false);
    }
  }, [analysisId, generateLessons]);

  const handleCreateAudit = useCallback(async () => {
    if (!activeWorkspaceId || !analysis) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createAudit({
        workspaceId: activeWorkspaceId,
        title: `Audit from impact: ${analysis.title}`,
        summary: analysis.generatedSummary,
        scope: {
          impactAnalysisId: analysis.id as Id<"impactAnalyses">,
          projectIds: analysis.projectId ? [analysis.projectId as Id<"projects">] : undefined,
          windowStart: analysis.window.baselineStart,
          windowEnd: analysis.window.impactEnd,
          visibility: "primary",
        },
      });
      window.location.href = `/audits/${result.reportId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create audit report");
    } finally {
      setBusy(false);
    }
  }, [activeWorkspaceId, analysis, createAudit, findings]);

  const lessonList = (linkedLessons ?? []) as LessonRecord[];

  if (data === undefined) {
    return <p className="impact-page__subtitle">Loading impact analysis…</p>;
  }

  if (!analysis) {
    return (
      <div>
        <p>Impact analysis not found.</p>
        <Link href="/impact" className="impact-detail-page__back">← Back to Impact</Link>
      </div>
    );
  }

  const metrics = analysis.metrics as
    | { baseline?: MetricsBundle; impact?: MetricsBundle }
    | undefined;

  return (
    <div className="impact-detail-page">
      <Link href="/impact" className="impact-detail-page__back">← Back to Impact</Link>

      <header>
        <span className={`impact-status impact-status--${analysis.status}`}>
          {analysis.status}
        </span>
        <h1 className="impact-page__title">{analysis.title}</h1>
        <p className="impact-page__subtitle">
          Anchor: {analysis.anchor.type} — {analysis.anchor.title} ·{" "}
          {formatWindowLabel(analysis.window.beforeMs, analysis.window.afterMs)}
        </p>
      </header>

      {error ? <p className="impact-page__subtitle">{error}</p> : null}

      <div className="impact-detail-page__actions">
        {canWrite && (analysis.status === "draft" || analysis.status === "failed") ? (
          <button
            type="button"
            className="impact-detail__action"
            disabled={busy}
            onClick={() => void handleGenerate()}
          >
            {analysis.status === "failed" ? "Re-generate" : "Generate"}
          </button>
        ) : null}
        <Link
          href={`/ask?impactAnalysisId=${analysis.id}`}
          className="impact-detail__action"
        >
          Ask about this impact
        </Link>
        {activeWorkspaceId ? (
          <GenerateContextPackButton
            workspaceId={activeWorkspaceId}
            scope={{
              impactAnalysisId: analysis.id,
              projectId: analysis.projectId,
              goal: analysis.title,
              title: `Context: ${analysis.title}`,
            }}
            className="impact-detail__action"
            label="Create Context Pack from Impact"
          />
        ) : null}
        {canManageAudit ? (
          <button
            type="button"
            className="impact-detail__action"
            disabled={busy || analysis.status !== "generated"}
            onClick={() => void handleCreateAudit()}
          >
            Create audit report from this impact
          </button>
        ) : null}
        {canWrite && analysis.status === "generated" ? (
          <button
            type="button"
            className="impact-detail__action"
            disabled={busy}
            onClick={() => void handleGenerateLessons()}
          >
            Generate Lessons
          </button>
        ) : null}
        {canWrite && lessonList.length > 0 ? (
          <button
            type="button"
            className="impact-detail__action"
            onClick={() => setShowPlaybookModal(true)}
          >
            Create Playbook from Lessons
          </button>
        ) : null}
      </div>

      <section className="impact-section">
        <h2>Summary</h2>
        <p>
          {analysis.generatedSummary ??
            analysis.summary ??
            "No summary yet. Generate the analysis to see before/after patterns."}
        </p>
        <p className="impact-page__subtitle">
          Correlation only — activity in the impact window may be related to the anchor change.
        </p>
      </section>

      {metrics?.baseline && metrics?.impact ? (
        <section className="impact-section">
          <h2>Metrics</h2>
          <div className="impact-metrics-grid">
            <MetricsCard
              title="Product"
              baseline={metrics.baseline.product as Record<string, unknown>}
              impact={metrics.impact.product as Record<string, unknown>}
            />
            <MetricsCard
              title="Revenue"
              baseline={metrics.baseline.revenue as Record<string, unknown>}
              impact={metrics.impact.revenue as Record<string, unknown>}
            />
            <MetricsCard
              title="Engineering"
              baseline={metrics.baseline.engineering as Record<string, unknown>}
              impact={metrics.impact.engineering as Record<string, unknown>}
            />
            <MetricsCard
              title="Decisions"
              baseline={metrics.baseline.decisions as Record<string, unknown>}
              impact={metrics.impact.decisions as Record<string, unknown>}
            />
          </div>
        </section>
      ) : null}

      <section className="impact-section">
        <h2>Findings</h2>
        {findings.length === 0 ? (
          <p className="impact-page__subtitle">No findings yet.</p>
        ) : (
          findings.map((finding) => (
            <div key={finding.id} className="impact-finding">
              <div className="impact-finding__badges">
                <span className="impact-badge">{finding.severity}</span>
                <span className="impact-badge">{finding.confidence}</span>
                <span className="impact-badge">{finding.type}</span>
              </div>
              <strong>{finding.title}</strong>
              <p>{finding.summary}</p>
            </div>
          ))
        )}
      </section>

      <section className="impact-section">
        <h2>Evidence</h2>
        <ul className="impact-evidence-list">
          {findings.flatMap((finding) =>
            (finding.evidenceEventIds ?? []).map((eventId) => (
              <li key={`event-${eventId}`}>
                <Link href={`/timeline?eventId=${eventId}`}>Event {eventId}</Link>
              </li>
            )),
          )}
          {findings.flatMap((finding) =>
            (finding.evidenceWorkstreamIds ?? []).map((wsId) => (
              <li key={`ws-${wsId}`}>
                <Link href={`/workstreams/${wsId}`}>Workstream {wsId}</Link>
              </li>
            )),
          )}
          {findings.flatMap((finding) =>
            (finding.evidenceEntityIds ?? []).map((entityId) => (
              <li key={`entity-${entityId}`}>
                <Link href={`/entities/${entityId}`}>Entity {entityId}</Link>
              </li>
            )),
          )}
        </ul>
      </section>

      <section className="impact-section">
        <h2>Lessons from this impact</h2>
        {lessonList.length === 0 ? (
          <p className="impact-page__subtitle">
            No lessons yet. Generate lessons from findings above.
          </p>
        ) : (
          <ul className="impact-evidence-list">
            {lessonList.map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/lessons/${lesson.id}`}>{lesson.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {findings.some((f) => f.type === "related_work") ? (
        <section className="impact-section">
          <h2>Related Work</h2>
          {findings
            .filter((f) => f.type === "related_work")
            .map((finding) => (
              <div key={finding.id} className="impact-finding">
                <strong>{finding.title}</strong>
                <p>{finding.summary}</p>
              </div>
            ))}
        </section>
      ) : null}

      {showPlaybookModal && activeWorkspaceId && lessonList.length > 0 ? (
        <GeneratePlaybookFromLessonsModal
          workspaceId={activeWorkspaceId}
          preselectedLessonIds={lessonList.map((l) => l.id)}
          onClose={() => setShowPlaybookModal(false)}
          onCreated={() => setShowPlaybookModal(false)}
        />
      ) : null}
    </div>
  );
}
