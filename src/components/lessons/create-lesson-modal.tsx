"use client";

import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { LessonType } from "@/types/lessons";
import "./lessons.css";

type CreateLessonModalProps = {
  workspaceId: string;
  onClose: () => void;
  onCreated: (lessonId: string) => void;
  projectId?: string;
  workstreamId?: string;
  entityId?: string;
  impactAnalysisId?: string;
};

export function CreateLessonModal({
  workspaceId,
  onClose,
  onCreated,
  projectId,
  workstreamId,
  entityId,
  impactAnalysisId,
}: CreateLessonModalProps) {
  const createLesson = useMutation(api.lessons.createManualLesson);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [type, setType] = useState<LessonType>("process_learning");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmedSummary = summary.trim();
    if (!trimmedTitle || !trimmedSummary) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createLesson({
        workspaceId,
        title: trimmedTitle,
        summary: trimmedSummary,
        recommendation: recommendation.trim() || undefined,
        type,
        projectId: projectId as never,
        workstreamId: workstreamId as never,
        entityId: entityId as never,
        impactAnalysisId: impactAnalysisId as never,
      });
      onCreated(result.lessonId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create lesson");
    } finally {
      setBusy(false);
    }
  }, [
    createLesson,
    entityId,
    impactAnalysisId,
    onCreated,
    projectId,
    recommendation,
    summary,
    title,
    type,
    workstreamId,
    workspaceId,
  ]);

  return (
    <div className="lessons-modal" role="dialog" aria-modal="true">
      <div className="lessons-modal__panel">
        <h2>Create Lesson</h2>
        {error ? <p className="lessons-page__subtitle">{error}</p> : null}
        <div className="lessons-modal__field">
          <label htmlFor="lesson-title">Title</label>
          <input
            id="lesson-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="lessons-modal__field">
          <label htmlFor="lesson-summary">Summary</label>
          <textarea
            id="lesson-summary"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div className="lessons-modal__field">
          <label htmlFor="lesson-recommendation">Recommendation</label>
          <textarea
            id="lesson-recommendation"
            rows={2}
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
          />
        </div>
        <div className="lessons-modal__field">
          <label htmlFor="lesson-type">Type</label>
          <select
            id="lesson-type"
            value={type}
            onChange={(e) => setType(e.target.value as LessonType)}
          >
            <option value="positive_pattern">Positive pattern</option>
            <option value="negative_pattern">Negative pattern</option>
            <option value="validation">Validation</option>
            <option value="product_learning">Product</option>
            <option value="revenue_learning">Revenue</option>
            <option value="engineering_learning">Engineering</option>
            <option value="security_learning">Security</option>
            <option value="process_learning">Process</option>
            <option value="risk">Risk</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="lessons-modal__actions">
          <button type="button" className="lessons-page__action" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="lessons-page__action"
            disabled={busy}
            onClick={() => void handleCreate()}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
