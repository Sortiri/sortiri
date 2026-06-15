"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { LessonRecord } from "@/types/lessons";
import "./playbooks.css";

type GeneratePlaybookFromLessonsModalProps = {
  workspaceId: string;
  onClose: () => void;
  onCreated: (playbookId: string) => void;
  preselectedLessonIds?: string[];
};

export function GeneratePlaybookFromLessonsModal({
  workspaceId,
  onClose,
  onCreated,
  preselectedLessonIds = [],
}: GeneratePlaybookFromLessonsModalProps) {
  const lessons = useQuery(api.lessons.listByWorkspace, {
    workspaceId,
    status: "active",
  });
  const generatePlaybook = useMutation(api.playbooks.generateFromLessons);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preselectedLessonIds),
  );
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lessonList = useMemo(
    () => (lessons ?? []) as LessonRecord[],
    [lessons],
  );

  const toggleLesson = (lessonId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const handleGenerate = useCallback(async () => {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await generatePlaybook({
        workspaceId,
        lessonIds: [...selected] as Id<"lessons">[],
        title: title.trim() || undefined,
      });
      onCreated(result.playbookId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate playbook");
    } finally {
      setBusy(false);
    }
  }, [generatePlaybook, onCreated, selected, title, workspaceId]);

  return (
    <div className="playbooks-modal" role="dialog" aria-modal="true">
      <div className="playbooks-modal__panel">
        <h2>Generate Playbook from Lessons</h2>
        {error ? <p className="playbooks-page__subtitle">{error}</p> : null}
        <div className="playbooks-modal__field">
          <label htmlFor="playbook-gen-title">Title (optional)</label>
          <input
            id="playbook-gen-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="playbooks-modal__field">
          <p>Select lessons</p>
          {lessonList.map((lesson) => (
            <label key={lesson.id} style={{ display: "block", marginBottom: "0.5rem" }}>
              <input
                type="checkbox"
                checked={selected.has(lesson.id)}
                onChange={() => toggleLesson(lesson.id)}
              />{" "}
              {lesson.title}
            </label>
          ))}
        </div>
        <div className="playbooks-modal__actions">
          <button type="button" className="playbooks-page__action" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="playbooks-page__action"
            disabled={busy || selected.size === 0}
            onClick={() => void handleGenerate()}
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
