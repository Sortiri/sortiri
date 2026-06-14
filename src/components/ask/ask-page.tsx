"use client";

import { useAction, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AskAnswer } from "@/components/ask/ask-answer";
import { AskEmptyState } from "@/components/ask/ask-empty-state";
import { AskHistory } from "@/components/ask/ask-history";
import { AskInput } from "@/components/ask/ask-input";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { AskSessionDetail } from "@/types/ask";
import "./ask.css";

const PROJECT_FOCUS_QUESTION = "What happened in this project recently?";
const WORKSTREAM_FOCUS_QUESTION = "What happened in this workstream?";

export function AskPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const searchParams = useSearchParams();

  const initialQuestion = searchParams.get("q") ?? "";
  const workstreamIdParam = searchParams.get("workstreamId");
  const entityIdParam = searchParams.get("entityId");

  const projectIdParam = searchParams.get("projectId");

  const [question, setQuestion] = useState(initialQuestion);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [localAnswer, setLocalAnswer] = useState<string | null>(null);
  const [localEvidence, setLocalEvidence] = useState<AskSessionDetail["evidence"] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const workstreamId = workstreamIdParam
    ? (workstreamIdParam as Id<"workstreams">)
    : undefined;

  const entityId = entityIdParam ? (entityIdParam as Id<"entities">) : undefined;

  const projectId = projectIdParam
    ? (projectIdParam as Id<"projects">)
    : undefined;

  const selectedProject = useQuery(
    api.projects.getById,
    activeWorkspaceId && projectId
      ? { workspaceId: activeWorkspaceId, projectId }
      : "skip",
  );

  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
    } else if (projectIdParam) {
      setQuestion(PROJECT_FOCUS_QUESTION);
    } else if (workstreamIdParam) {
      setQuestion(WORKSTREAM_FOCUS_QUESTION);
    }
  }, [initialQuestion, projectIdParam, workstreamIdParam]);

  const askAction = useAction(api.ask.ask);

  const sessions = useQuery(
    api.ask.listSessions,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, limit: 20 } : "skip",
  );

  const timelineProbe = useQuery(
    api.events.listByWorkspace,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, limit: 1 } : "skip",
  );

  const sessionDetail = useQuery(
    api.ask.getSession,
    activeSessionId ? { sessionId: activeSessionId as Id<"askSessions"> } : "skip",
  );

  const handleSubmit = useCallback(async () => {
    if (!activeWorkspaceId) return;

    const trimmed = question.trim();
    if (!trimmed) return;

    setError(null);
    setSubmitting(true);
    setPendingQuestion(trimmed);
    setLocalAnswer(null);
    setLocalEvidence(null);
    setActiveSessionId(null);

    try {
      const result = await askAction({
        workspaceId: activeWorkspaceId,
        question: trimmed,
        workstreamId,
        entityId,
        projectId,
      });
      setActiveSessionId(result.sessionId);
      setLocalAnswer(result.answer);
      setLocalEvidence({ events: [], workstreams: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get an answer");
      setPendingQuestion(null);
    } finally {
      setSubmitting(false);
    }
  }, [activeWorkspaceId, askAction, question, workstreamId, entityId, projectId]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      const session = sessions?.find((item) => item.id === sessionId);
      if (session) {
        setQuestion(session.question);
      }
      setActiveSessionId(sessionId);
      setPendingQuestion(null);
      setLocalAnswer(null);
      setLocalEvidence(null);
      setError(null);
    },
    [sessions],
  );

  const display = useMemo(() => {
    if (sessionDetail) {
      return {
        question: sessionDetail.question,
        answer: sessionDetail.answer,
        evidenceEvents: sessionDetail.evidence.events,
        evidenceWorkstreams: sessionDetail.evidence.workstreams,
      };
    }

    if (pendingQuestion) {
      return {
        question: pendingQuestion,
        answer: localAnswer ?? undefined,
        evidenceEvents: localEvidence?.events ?? [],
        evidenceWorkstreams: localEvidence?.workstreams ?? [],
      };
    }

    return null;
  }, [sessionDetail, pendingQuestion, localAnswer, localEvidence]);

  const loading = wsLoading || (activeWorkspaceId !== null && sessions === undefined);
  const hasTimelineData = (timelineProbe?.length ?? 0) > 0;
  const showEmptyState = !loading && !hasTimelineData && !display && !submitting;

  return (
    <div className="ask-page">
      <header className="ask-page__header">
        <h1 className="ask-page__title">Ask Sortiri</h1>
        <p className="ask-page__subtitle">
          Ask questions about your company timeline and get answers grounded in your
          events and workstreams.
        </p>
        {selectedProject ? (
          <p className="ask-page__context project-chip">
            Project: {selectedProject.name}
          </p>
        ) : null}
      </header>

      {loading ? <p className="ask-page__loading">Loading…</p> : null}

      <div className="ask-page__layout">
        <div className="ask-page__main">
          {showEmptyState ? <AskEmptyState /> : null}

          <AskInput
            value={question}
            onChange={setQuestion}
            onSubmit={() => void handleSubmit()}
            disabled={!activeWorkspaceId}
            submitting={submitting}
          />

          {display || submitting ? (
            <AskAnswer
              question={display?.question ?? pendingQuestion ?? ""}
              answer={display?.answer}
              loading={submitting && !display?.answer}
              error={error}
              evidenceEvents={display?.evidenceEvents}
              evidenceWorkstreams={display?.evidenceWorkstreams}
            />
          ) : null}
        </div>

        {sessions && sessions.length > 0 ? (
          <div className="ask-page__sidebar">
            <AskHistory
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelect={handleSelectSession}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
