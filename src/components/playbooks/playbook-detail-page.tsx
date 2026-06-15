"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { formatPlaybookForCursor } from "@/lib/playbooks/copyForCursor";
import { GenerateContextPackButton } from "@/components/context/generate-context-pack-button";
import {
  PLAYBOOK_TYPE_LABELS,
  type PlaybookRecord,
} from "@/types/playbooks";
import type { LessonRecord } from "@/types/lessons";
import "./playbooks.css";

type PlaybookDetailPageProps = {
  playbookId: string;
};

export function PlaybookDetailPage({ playbookId }: PlaybookDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;

  const data = useQuery(api.playbooks.getById, {
    playbookId: playbookId as Id<"playbooks">,
  });

  const activatePlaybook = useMutation(api.playbooks.activate);
  const archivePlaybook = useMutation(api.playbooks.archive);
  const generateEvalSuite = useMutation(api.evals.generateFromPlaybook);

  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playbook = data?.playbook as PlaybookRecord | undefined;
  const lessons = (data?.lessons ?? []) as LessonRecord[];

  const handleCopy = useCallback(async () => {
    if (!playbook) return;
    const text = formatPlaybookForCursor(playbook, lessons);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [lessons, playbook]);

  const handleActivate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await activatePlaybook({ playbookId: playbookId as Id<"playbooks"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not activate playbook");
    } finally {
      setBusy(false);
    }
  }, [activatePlaybook, playbookId]);

  const handleArchive = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await archivePlaybook({ playbookId: playbookId as Id<"playbooks"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive playbook");
    } finally {
      setBusy(false);
    }
  }, [archivePlaybook, playbookId]);

  if (data === undefined) {
    return <p className="playbooks-page__subtitle">Loading playbook…</p>;
  }

  if (!playbook) {
    return (
      <div>
        <p>Playbook not found.</p>
        <Link href="/playbooks" className="playbooks-detail-page__back">
          ← Back to Playbooks
        </Link>
      </div>
    );
  }

  return (
    <div className="playbooks-detail-page">
      <Link href="/playbooks" className="playbooks-detail-page__back">
        ← Back to Playbooks
      </Link>

      <header>
        <span className="playbooks-badge">{PLAYBOOK_TYPE_LABELS[playbook.type]}</span>
        <span className="playbooks-badge">{playbook.status}</span>
        <h1 className="playbooks-page__title">{playbook.title}</h1>
        <p className="playbooks-page__subtitle">{playbook.summary}</p>
      </header>

      {error ? <p className="playbooks-page__subtitle">{error}</p> : null}

      <div className="playbooks-detail-page__actions">
        <button type="button" className="playbooks-page__action" onClick={() => void handleCopy()}>
          {copied ? "Copied!" : "Copy for Cursor"}
        </button>
        <Link href={`/ask?playbookId=${playbook.id}`} className="playbooks-page__action">
          Ask about this playbook
        </Link>
        {activeWorkspaceId ? (
          <GenerateContextPackButton
            workspaceId={activeWorkspaceId}
            scope={{
              playbookId: playbook.id,
              projectId: playbook.projectId,
              goal: playbook.title,
              title: `Context: ${playbook.title}`,
            }}
            className="playbooks-page__action"
            label="Create Context Pack from Playbook"
          />
        ) : null}
        {canWrite ? (
          <button
            type="button"
            className="playbooks-page__action"
            disabled={busy}
            onClick={() =>
              void (async () => {
                setBusy(true);
                setError(null);
                try {
                  const result = await generateEvalSuite({
                    playbookId: playbookId as Id<"playbooks">,
                  });
                  window.location.href = `/intelligence/evals/${result.suiteId}`;
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not generate eval suite");
                } finally {
                  setBusy(false);
                }
              })()
            }
          >
            Generate Eval Suite
          </button>
        ) : null}
        {canWrite && playbook.status === "draft" ? (
          <button
            type="button"
            className="playbooks-page__action"
            disabled={busy}
            onClick={() => void handleActivate()}
          >
            Activate
          </button>
        ) : null}
        {canWrite && playbook.status !== "archived" ? (
          <button
            type="button"
            className="playbooks-page__action"
            disabled={busy}
            onClick={() => void handleArchive()}
          >
            Archive
          </button>
        ) : null}
      </div>

      {playbook.trigger ? (
        <section className="playbooks-section">
          <h2>When to use</h2>
          <p>{playbook.trigger}</p>
        </section>
      ) : null}

      <section className="playbooks-section">
        <h2>Steps</h2>
        {playbook.steps.map((step, index) => (
          <div key={`${step.title}-${index}`} className="playbooks-step">
            <strong>
              {step.order ?? index + 1}. {step.title}
              {step.required ? " (required)" : ""}
            </strong>
            {step.description ? <p>{step.description}</p> : null}
          </div>
        ))}
      </section>

      {(playbook.validationRequirements?.length ?? 0) > 0 ? (
        <section className="playbooks-section">
          <h2>Validation Requirements</h2>
          {playbook.validationRequirements!.map((req, index) => (
            <div key={`${req.title}-${index}`} className="playbooks-step">
              <strong>{req.title}</strong>
              {req.command ? <p>Command: {req.command}</p> : null}
              {req.reason ? <p>{req.reason}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      {lessons.length > 0 ? (
        <section className="playbooks-section">
          <h2>Related Lessons</h2>
          <ul>
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/lessons/${lesson.id}`}>{lesson.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
