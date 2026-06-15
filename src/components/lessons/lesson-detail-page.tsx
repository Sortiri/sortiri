"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { GeneratePlaybookFromLessonsModal } from "@/components/playbooks/generate-playbook-from-lessons-modal";
import { GenerateContextPackButton } from "@/components/context/generate-context-pack-button";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { LESSON_TYPE_LABELS, type LessonRecord } from "@/types/lessons";
import "./lessons.css";

type LessonDetailPageProps = {
  lessonId: string;
};

export function LessonDetailPage({ lessonId }: LessonDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const canManageAudit = capabilities?.canManageAuditReports ?? false;

  const data = useQuery(api.lessons.getById, {
    lessonId: lessonId as Id<"lessons">,
  });

  const archiveLesson = useMutation(api.lessons.archive);
  const activateLesson = useMutation(api.lessons.activate);
  const createAudit = useMutation(api.auditReports.create);
  const generateEvalSuite = useMutation(api.evals.generateFromLesson);

  const [busy, setBusy] = useState(false);
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lesson = data?.lesson as LessonRecord | undefined;
  const evidence = data?.accessibleEvidence;

  const handleArchive = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await archiveLesson({ lessonId: lessonId as Id<"lessons"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive lesson");
    } finally {
      setBusy(false);
    }
  }, [archiveLesson, lessonId]);

  const handleActivate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await activateLesson({ lessonId: lessonId as Id<"lessons"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not activate lesson");
    } finally {
      setBusy(false);
    }
  }, [activateLesson, lessonId]);

  const handleCreateAudit = useCallback(async () => {
    if (!activeWorkspaceId || !lesson) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createAudit({
        workspaceId: activeWorkspaceId,
        title: `Audit from lesson: ${lesson.title}`,
        summary: lesson.summary,
        scope: {
          lessonIds: [lesson.id as Id<"lessons">],
          projectIds: lesson.projectId
            ? [lesson.projectId as Id<"projects">]
            : undefined,
          visibility: "primary",
        },
      });
      window.location.href = `/audits/${result.reportId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create audit report");
    } finally {
      setBusy(false);
    }
  }, [activeWorkspaceId, createAudit, lesson]);

  if (data === undefined) {
    return <p className="lessons-page__subtitle">Loading lesson…</p>;
  }

  if (!lesson) {
    return (
      <div>
        <p>Lesson not found.</p>
        <Link href="/lessons" className="lessons-detail-page__back">
          ← Back to Lessons
        </Link>
      </div>
    );
  }

  return (
    <div className="lessons-detail-page">
      <Link href="/lessons" className="lessons-detail-page__back">
        ← Back to Lessons
      </Link>

      <header>
        <span className="lessons-badge">{LESSON_TYPE_LABELS[lesson.type]}</span>
        <span className="lessons-badge">{lesson.status}</span>
        <h1 className="lessons-page__title">{lesson.title}</h1>
        <p className="lessons-page__subtitle">
          {lesson.confidence} confidence · {lesson.importance} importance · {lesson.source}
        </p>
      </header>

      {error ? <p className="lessons-page__subtitle">{error}</p> : null}

      <div className="lessons-detail-page__actions">
        <Link href={`/ask?lessonId=${lesson.id}`} className="lessons-page__action">
          Ask about this lesson
        </Link>
        {activeWorkspaceId ? (
          <GenerateContextPackButton
            workspaceId={activeWorkspaceId}
            scope={{
              lessonId: lesson.id,
              projectId: lesson.projectId,
              goal: lesson.title,
              title: `Context: ${lesson.title}`,
            }}
            className="lessons-page__action"
            label="Create Context Pack from Lesson"
          />
        ) : null}
        {canWrite ? (
          <button
            type="button"
            className="lessons-page__action"
            disabled={busy}
            onClick={() =>
              void (async () => {
                setBusy(true);
                setError(null);
                try {
                  const result = await generateEvalSuite({
                    lessonId: lessonId as Id<"lessons">,
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
        {canWrite ? (
          <button
            type="button"
            className="lessons-page__action"
            onClick={() => setShowPlaybookModal(true)}
          >
            Create Playbook
          </button>
        ) : null}
        {canManageAudit ? (
          <button
            type="button"
            className="lessons-page__action"
            disabled={busy}
            onClick={() => void handleCreateAudit()}
          >
            Create audit report
          </button>
        ) : null}
        {canWrite && lesson.status === "active" ? (
          <button
            type="button"
            className="lessons-page__action"
            disabled={busy}
            onClick={() => void handleArchive()}
          >
            Archive
          </button>
        ) : null}
        {canWrite && lesson.status === "archived" ? (
          <button
            type="button"
            className="lessons-page__action"
            disabled={busy}
            onClick={() => void handleActivate()}
          >
            Activate
          </button>
        ) : null}
      </div>

      <section className="lessons-section">
        <h2>Summary</h2>
        <p>{lesson.summary}</p>
      </section>

      {lesson.recommendation ? (
        <section className="lessons-section">
          <h2>Recommendation</h2>
          <p>{lesson.recommendation}</p>
        </section>
      ) : null}

      <section className="lessons-section">
        <h2>Evidence</h2>
        <ul>
          {(evidence?.eventIds ?? lesson.evidenceEventIds ?? []).map((eventId) => (
            <li key={`event-${eventId}`}>
              <Link href={`/timeline?eventId=${eventId}`}>Event {eventId}</Link>
            </li>
          ))}
          {(evidence?.workstreamIds ?? lesson.evidenceWorkstreamIds ?? []).map((wsId) => (
            <li key={`ws-${wsId}`}>
              <Link href={`/workstreams/${wsId}`}>Workstream {wsId}</Link>
            </li>
          ))}
        </ul>
      </section>

      {lesson.impactAnalysisId ? (
        <section className="lessons-section">
          <h2>Related Impact</h2>
          <Link href={`/impact/${lesson.impactAnalysisId}`}>
            Impact analysis {lesson.impactAnalysisId}
          </Link>
        </section>
      ) : null}

      {showPlaybookModal && activeWorkspaceId ? (
        <GeneratePlaybookFromLessonsModal
          workspaceId={activeWorkspaceId}
          preselectedLessonIds={[lesson.id]}
          onClose={() => setShowPlaybookModal(false)}
          onCreated={() => setShowPlaybookModal(false)}
        />
      ) : null}
    </div>
  );
}
