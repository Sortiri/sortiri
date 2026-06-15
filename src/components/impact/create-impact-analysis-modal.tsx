"use client";

import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { InsightsWindowFilter } from "@/components/insights/insights-window-filter";
import type { ImpactWindowPreset } from "@/types/impact-analysis";
import "./impact.css";

type CreateImpactAnalysisModalProps = {
  workspaceId: string;
  onClose: () => void;
  onCreated: (analysisId: string) => void;
  anchor?: {
    type: "event" | "workstream" | "project" | "view" | "entity" | "manual";
    eventId?: string;
    workstreamId?: string;
    projectId?: string;
    viewId?: string;
    entityId?: string;
    title: string;
    occurredAt?: number;
  };
  projectId?: string;
  viewId?: string;
};

export function CreateImpactAnalysisModal({
  workspaceId,
  onClose,
  onCreated,
  anchor,
  projectId,
  viewId,
}: CreateImpactAnalysisModalProps) {
  const createAnalysis = useMutation(api.impactAnalyses.create);
  const generateAnalysis = useMutation(api.impactAnalyses.generate);
  const [title, setTitle] = useState(anchor ? `Impact: ${anchor.title}` : "Impact analysis");
  const [windowPreset, setWindowPreset] = useState<ImpactWindowPreset>("7d");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setBusy(true);
    setError(null);
    try {
      const resolvedAnchor = anchor ?? {
        type: "manual" as const,
        title: trimmedTitle,
        occurredAt: Date.now(),
      };

      const result = await createAnalysis({
        workspaceId,
        title: trimmedTitle,
        anchor: {
          type: resolvedAnchor.type,
          eventId: resolvedAnchor.eventId as Id<"events"> | undefined,
          workstreamId: resolvedAnchor.workstreamId as Id<"workstreams"> | undefined,
          projectId: resolvedAnchor.projectId as Id<"projects"> | undefined,
          viewId: resolvedAnchor.viewId as Id<"savedViews"> | undefined,
          entityId: resolvedAnchor.entityId as Id<"entities"> | undefined,
          title: resolvedAnchor.title,
          occurredAt: resolvedAnchor.occurredAt ?? Date.now(),
        },
        windowPreset,
        projectId: projectId as Id<"projects"> | undefined,
        viewId: viewId as Id<"savedViews"> | undefined,
      });

      await generateAnalysis({ analysisId: result.analysisId });
      onCreated(result.analysisId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create impact analysis");
    } finally {
      setBusy(false);
    }
  }, [
    anchor,
    createAnalysis,
    generateAnalysis,
    onClose,
    onCreated,
    projectId,
    title,
    viewId,
    windowPreset,
    workspaceId,
  ]);

  return (
    <div className="impact-modal-backdrop" onClick={onClose}>
      <div className="impact-modal" onClick={(event) => event.stopPropagation()}>
        <h2 className="impact-modal__title">New Impact Analysis</h2>
        {anchor ? (
          <p className="impact-page__subtitle">
            Anchored to {anchor.type}: {anchor.title}
          </p>
        ) : null}
        <div className="impact-modal__field">
          <label htmlFor="impact-title">Title</label>
          <input
            id="impact-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="impact-modal__field">
          <label>Window preset</label>
          <InsightsWindowFilter value={windowPreset} onChange={setWindowPreset} />
        </div>
        {error ? <p className="impact-page__subtitle">{error}</p> : null}
        <div className="impact-modal__actions">
          <button type="button" className="impact-detail__action" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="impact-page__create-action"
            disabled={busy || !title.trim()}
            onClick={() => void handleCreate()}
          >
            {busy ? "Creating…" : "Create & Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
