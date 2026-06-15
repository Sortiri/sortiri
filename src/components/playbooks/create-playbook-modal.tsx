"use client";

import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { PlaybookType } from "@/types/playbooks";
import "./playbooks.css";

type CreatePlaybookModalProps = {
  workspaceId: string;
  onClose: () => void;
  onCreated: (playbookId: string) => void;
  projectId?: string;
};

export function CreatePlaybookModal({
  workspaceId,
  onClose,
  onCreated,
  projectId,
}: CreatePlaybookModalProps) {
  const createPlaybook = useMutation(api.playbooks.createManualPlaybook);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [trigger, setTrigger] = useState("");
  const [type, setType] = useState<PlaybookType>("custom");
  const [stepTitle, setStepTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmedSummary = summary.trim();
    if (!trimmedTitle || !trimmedSummary) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createPlaybook({
        workspaceId,
        title: trimmedTitle,
        summary: trimmedSummary,
        type,
        trigger: trigger.trim() || undefined,
        steps: [
          {
            title: stepTitle.trim() || "Review linked lessons and evidence",
            order: 1,
            required: true,
          },
        ],
        projectId: projectId as never,
      });
      onCreated(result.playbookId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create playbook");
    } finally {
      setBusy(false);
    }
  }, [
    createPlaybook,
    onCreated,
    projectId,
    stepTitle,
    summary,
    title,
    trigger,
    type,
    workspaceId,
  ]);

  return (
    <div className="playbooks-modal" role="dialog" aria-modal="true">
      <div className="playbooks-modal__panel">
        <h2>Create Playbook</h2>
        {error ? <p className="playbooks-page__subtitle">{error}</p> : null}
        <div className="playbooks-modal__field">
          <label htmlFor="playbook-title">Title</label>
          <input
            id="playbook-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="playbooks-modal__field">
          <label htmlFor="playbook-summary">Summary</label>
          <textarea
            id="playbook-summary"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div className="playbooks-modal__field">
          <label htmlFor="playbook-trigger">When to use (trigger keywords)</label>
          <input
            id="playbook-trigger"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
          />
        </div>
        <div className="playbooks-modal__field">
          <label htmlFor="playbook-type">Type</label>
          <select
            id="playbook-type"
            value={type}
            onChange={(e) => setType(e.target.value as PlaybookType)}
          >
            <option value="engineering">Engineering</option>
            <option value="product">Product</option>
            <option value="revenue">Revenue</option>
            <option value="security">Security</option>
            <option value="audit">Audit</option>
            <option value="integration">Integration</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="playbooks-modal__field">
          <label htmlFor="playbook-step">First step</label>
          <input
            id="playbook-step"
            value={stepTitle}
            onChange={(e) => setStepTitle(e.target.value)}
          />
        </div>
        <div className="playbooks-modal__actions">
          <button type="button" className="playbooks-page__action" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="playbooks-page__action"
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
