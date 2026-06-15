"use client";

import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import "./context.css";

export type ContextPackScope = {
  projectId?: string;
  workstreamId?: string;
  entityId?: string;
  playbookId?: string;
  lessonId?: string;
  impactAnalysisId?: string;
  goal?: string;
  title?: string;
};

type CreateContextPackModalProps = {
  workspaceId: string;
  scope?: ContextPackScope;
  onClose: () => void;
  onCreated: (contextPackId: string) => void;
};

export function CreateContextPackModal({
  workspaceId,
  scope,
  onClose,
  onCreated,
}: CreateContextPackModalProps) {
  const createPack = useMutation(api.contextPacks.create);
  const generatePack = useMutation(api.contextPacks.generate);
  const [goal, setGoal] = useState(scope?.goal ?? "");
  const [title, setTitle] = useState(scope?.title ?? "");
  const [files, setFiles] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const trimmedGoal = goal.trim();
    if (!trimmedGoal) return;
    setBusy(true);
    setError(null);
    try {
      const fileList = files
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const result = await createPack({
        workspaceId,
        goal: trimmedGoal,
        title: title.trim() || undefined,
        projectId: scope?.projectId as Id<"projects"> | undefined,
        workstreamId: scope?.workstreamId as Id<"workstreams"> | undefined,
        entityId: scope?.entityId as Id<"entities"> | undefined,
        playbookId: scope?.playbookId as Id<"playbooks"> | undefined,
        lessonId: scope?.lessonId as Id<"lessons"> | undefined,
        impactAnalysisId: scope?.impactAnalysisId as Id<"impactAnalyses"> | undefined,
        request: fileList.length > 0 ? { files: fileList } : undefined,
      });
      await generatePack({ contextPackId: result.contextPackId });
      onCreated(result.contextPackId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create context pack");
    } finally {
      setBusy(false);
    }
  }, [
    createPack,
    files,
    generatePack,
    goal,
    onClose,
    onCreated,
    scope,
    title,
    workspaceId,
  ]);

  return (
    <div className="context-modal-backdrop" onClick={onClose}>
      <div className="context-modal" onClick={(event) => event.stopPropagation()}>
        <h2 className="context-modal__title">Create Context Pack</h2>
        <p className="context-page__subtitle">
          Gather lessons, playbooks, failures, and validation requirements for agent work.
        </p>
        <label className="context-modal__field">
          <span className="context-modal__label">Goal</span>
          <textarea
            className="context-modal__textarea"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="What are you trying to accomplish?"
          />
        </label>
        <label className="context-modal__field">
          <span className="context-modal__label">Title (optional)</span>
          <input
            className="context-modal__input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="context-modal__field">
          <span className="context-modal__label">Relevant files (one per line)</span>
          <textarea
            className="context-modal__textarea"
            value={files}
            onChange={(event) => setFiles(event.target.value)}
            placeholder="src/app/page.tsx"
          />
        </label>
        {error ? <p className="context-page__subtitle">{error}</p> : null}
        <div className="context-modal__actions">
          <button type="button" className="context-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="context-btn context-btn--primary"
            onClick={() => void handleCreate()}
            disabled={busy || !goal.trim()}
          >
            {busy ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
