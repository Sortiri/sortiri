"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { InsightsWindowFilter } from "@/components/insights/insights-window-filter";
import { ProjectFilter } from "@/components/projects/project-filter";
import { getWindowBounds } from "@/lib/insight-window";
import type { InsightWindow } from "@/types/insights";
import type { ProjectRecord } from "@/types/projects";

type CreateAuditReportModalProps = {
  workspaceId: string;
  onClose: () => void;
  onCreated: (reportId: string) => void;
};

export function CreateAuditReportModal({
  workspaceId,
  onClose,
  onCreated,
}: CreateAuditReportModalProps) {
  const createReport = useMutation(api.auditReports.create);
  const projects = useQuery(api.projects.listByWorkspace, {
    workspaceId,
    status: "active",
  });
  const projectList = (projects ?? []) as ProjectRecord[];
  const [title, setTitle] = useState("Audit report");
  const [summary, setSummary] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [window, setWindow] = useState<InsightWindow>("7d");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setBusy(true);
    setError(null);
    try {
      const { windowStart, windowEnd } = getWindowBounds(window);
      const result = await createReport({
        workspaceId,
        title: trimmedTitle,
        summary: summary.trim() || undefined,
        scope: {
          projectIds: projectId ? [projectId as Id<"projects">] : undefined,
          windowStart,
          windowEnd,
          visibility: "primary",
        },
      });
      onCreated(result.reportId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create report");
    } finally {
      setBusy(false);
    }
  }, [createReport, onClose, onCreated, projectId, summary, title, window, workspaceId]);

  return (
    <div className="audit-modal-backdrop" onClick={onClose}>
      <div className="audit-modal" onClick={(event) => event.stopPropagation()}>
        <h2 className="audit-modal__title">Create audit report</h2>
        <div className="audit-modal__field">
          <label htmlFor="audit-title">Title</label>
          <input
            id="audit-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="audit-modal__field">
          <label htmlFor="audit-summary">Summary</label>
          <textarea
            id="audit-summary"
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </div>
        <div className="audit-modal__field">
          <label>Project scope</label>
          <ProjectFilter
            projects={projectList}
            value={projectId}
            onChange={setProjectId}
          />
        </div>
        <div className="audit-modal__field">
          <label>Time window</label>
          <InsightsWindowFilter value={window} onChange={setWindow} />
        </div>
        {error ? <p className="audit-modal__error">{error}</p> : null}
        <div className="audit-modal__actions">
          <button type="button" className="audit-detail__action" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="audits-page__create-action"
            disabled={busy}
            onClick={() => void handleCreate()}
          >
            {busy ? "Creating…" : "Create draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
