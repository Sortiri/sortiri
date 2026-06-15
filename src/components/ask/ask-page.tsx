"use client";

import { useAction, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
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
  const viewIdParam = searchParams.get("viewId");
  const auditReportIdParam = searchParams.get("auditReportId");
  const impactAnalysisIdParam = searchParams.get("impactAnalysisId");
  const lessonIdParam = searchParams.get("lessonId");
  const playbookIdParam = searchParams.get("playbookId");
  const contextPackIdParam = searchParams.get("contextPackId");
  const recommendationIdParam = searchParams.get("recommendationId");
  const evalSuiteIdParam = searchParams.get("evalSuiteId");
  const evalRunIdParam = searchParams.get("evalRunId");

  const [questionDraft, setQuestionDraft] = useState<string | null>(null);
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

  const viewId = viewIdParam ? (viewIdParam as Id<"savedViews">) : undefined;

  const auditReportId = auditReportIdParam
    ? (auditReportIdParam as Id<"auditReports">)
    : undefined;

  const impactAnalysisId = impactAnalysisIdParam
    ? (impactAnalysisIdParam as Id<"impactAnalyses">)
    : undefined;

  const lessonId = lessonIdParam ? (lessonIdParam as Id<"lessons">) : undefined;
  const playbookId = playbookIdParam ? (playbookIdParam as Id<"playbooks">) : undefined;
  const contextPackId = contextPackIdParam
    ? (contextPackIdParam as Id<"contextPacks">)
    : undefined;
  const recommendationId = recommendationIdParam
    ? (recommendationIdParam as Id<"recommendations">)
    : undefined;
  const evalSuiteId = evalSuiteIdParam
    ? (evalSuiteIdParam as Id<"evalSuites">)
    : undefined;
  const evalRunId = evalRunIdParam ? (evalRunIdParam as Id<"evalRuns">) : undefined;

  const selectedView = useQuery(
    api.savedViews.getById,
    activeWorkspaceId && viewId
      ? { workspaceId: activeWorkspaceId, viewId }
      : "skip",
  );

  const selectedProject = useQuery(
    api.projects.getById,
    activeWorkspaceId && projectId
      ? { workspaceId: activeWorkspaceId, projectId }
      : "skip",
  );

  const selectedAuditReport = useQuery(
    api.auditReports.getById,
    auditReportId ? { reportId: auditReportId } : "skip",
  );

  const selectedImpactAnalysis = useQuery(
    api.impactAnalyses.getById,
    impactAnalysisId ? { analysisId: impactAnalysisId } : "skip",
  );

  const selectedLesson = useQuery(
    api.lessons.getById,
    lessonId ? { lessonId } : "skip",
  );

  const selectedPlaybook = useQuery(
    api.playbooks.getById,
    playbookId ? { playbookId } : "skip",
  );

  const selectedContextPack = useQuery(
    api.contextPacks.getById,
    contextPackId ? { contextPackId } : "skip",
  );

  const selectedRecommendation = useQuery(
    api.recommendations.getById,
    recommendationId ? { recommendationId } : "skip",
  );

  const selectedEvalSuite = useQuery(
    api.evals.getSuite,
    evalSuiteId ? { evalSuiteId } : "skip",
  );

  const selectedEvalRun = useQuery(
    api.evals.getRun,
    evalRunId ? { evalRunId } : "skip",
  );

  const suggestedQuestion = useMemo(() => {
    if (initialQuestion) return initialQuestion;
    if (impactAnalysisIdParam) {
      return `What patterns appear in the ${selectedImpactAnalysis?.analysis.title ?? "impact"} analysis?`;
    }
    if (lessonIdParam) {
      return `What should we remember from ${selectedLesson?.lesson.title ?? "this lesson"}?`;
    }
    if (playbookIdParam) {
      return `How should I use the ${selectedPlaybook?.playbook.title ?? "playbook"}?`;
    }
    if (contextPackIdParam) {
      return `What should I know from ${selectedContextPack?.pack.title ?? "this context pack"}?`;
    }
    if (recommendationIdParam) {
      return `What evidence supports the recommendation "${selectedRecommendation?.title ?? "this item"}"?`;
    }
    if (evalSuiteIdParam) {
      return `What does the eval suite "${selectedEvalSuite?.suite.title ?? "this suite"}" check?`;
    }
    if (evalRunIdParam) {
      return "Why did this eval fail and what should the agent fix next?";
    }
    if (auditReportIdParam) {
      return `What evidence supports the conclusions in the ${selectedAuditReport?.title ?? "audit"} report?`;
    }
    if (viewIdParam) {
      return `What happened in the ${selectedView?.name ?? "selected"} view recently?`;
    }
    if (projectIdParam) return PROJECT_FOCUS_QUESTION;
    if (workstreamIdParam) return WORKSTREAM_FOCUS_QUESTION;
    return "";
  }, [
    initialQuestion,
    impactAnalysisIdParam,
    selectedImpactAnalysis?.analysis.title,
    lessonIdParam,
    selectedLesson?.lesson.title,
    playbookIdParam,
    selectedPlaybook?.playbook.title,
    contextPackIdParam,
    selectedContextPack?.pack.title,
    recommendationIdParam,
    selectedRecommendation?.title,
    evalSuiteIdParam,
    selectedEvalSuite?.suite.title,
    evalRunIdParam,
    auditReportIdParam,
    selectedAuditReport?.title,
    projectIdParam,
    viewIdParam,
    workstreamIdParam,
    selectedView?.name,
  ]);

  const focusKey = `${initialQuestion}|${viewIdParam}|${projectIdParam}|${workstreamIdParam}|${auditReportIdParam}|${impactAnalysisIdParam}|${lessonIdParam}|${playbookIdParam}|${contextPackIdParam}|${recommendationIdParam}|${evalSuiteIdParam}|${evalRunIdParam}|${selectedView?.name ?? ""}|${selectedAuditReport?.title ?? ""}|${selectedImpactAnalysis?.analysis.title ?? ""}|${selectedLesson?.lesson.title ?? ""}|${selectedPlaybook?.playbook.title ?? ""}|${selectedContextPack?.pack.title ?? ""}|${selectedRecommendation?.title ?? ""}|${selectedEvalSuite?.suite.title ?? ""}|${selectedEvalRun?.run.status ?? ""}`;
  const [lastFocusKey, setLastFocusKey] = useState(focusKey);
  if (focusKey !== lastFocusKey) {
    setLastFocusKey(focusKey);
    setQuestionDraft(null);
  }

  const question = questionDraft ?? suggestedQuestion;

  const askAction = useAction(api.ask.ask);

  const sessions = useQuery(
    api.ask.listSessions,
    activeWorkspaceId && !auditReportId && !impactAnalysisId && !lessonId && !playbookId && !contextPackId && !recommendationId && !evalSuiteId && !evalRunId
      ? { workspaceId: activeWorkspaceId, limit: 20 }
      : "skip",
  );

  const timelineProbe = useQuery(
    api.events.listByWorkspace,
    activeWorkspaceId && !auditReportId && !impactAnalysisId && !lessonId && !playbookId && !contextPackId && !recommendationId && !evalSuiteId && !evalRunId
      ? { workspaceId: activeWorkspaceId, limit: 1 }
      : "skip",
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
        viewId,
        auditReportId,
        impactAnalysisId,
        lessonId,
        playbookId,
        contextPackId,
        recommendationId,
        evalSuiteId,
        evalRunId,
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
  }, [activeWorkspaceId, askAction, question, workstreamId, entityId, projectId, viewId, auditReportId, impactAnalysisId, lessonId, playbookId, contextPackId, recommendationId, evalSuiteId, evalRunId]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      const session = sessions?.find((item) => item.id === sessionId);
      if (session) {
        setQuestionDraft(session.question);
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

  const loading =
    wsLoading ||
    (activeWorkspaceId !== null && !auditReportId && !impactAnalysisId && !lessonId && !playbookId && sessions === undefined) ||
    (auditReportId !== undefined && selectedAuditReport === undefined) ||
    (impactAnalysisId !== undefined && selectedImpactAnalysis === undefined) ||
    (lessonId !== undefined && selectedLesson === undefined) ||
    (playbookId !== undefined && selectedPlaybook === undefined) ||
    (contextPackId !== undefined && selectedContextPack === undefined) ||
    (recommendationId !== undefined && selectedRecommendation === undefined) ||
    (evalSuiteId !== undefined && selectedEvalSuite === undefined) ||
    (evalRunId !== undefined && selectedEvalRun === undefined);
  const hasTimelineData = auditReportId
    ? (selectedAuditReport?.itemCount ?? 0) > 0
    : impactAnalysisId
      ? selectedImpactAnalysis?.analysis.status === "generated"
      : lessonId
        ? selectedLesson?.lesson !== undefined
        : playbookId
          ? selectedPlaybook?.playbook !== undefined
          : contextPackId
            ? selectedContextPack?.pack !== undefined
            : recommendationId
              ? selectedRecommendation !== undefined
              : evalSuiteId
                ? selectedEvalSuite?.suite !== undefined
                : evalRunId
                  ? selectedEvalRun?.run !== undefined
            : (timelineProbe?.length ?? 0) > 0;
  const showEmptyState = !loading && !hasTimelineData && !display && !submitting;

  return (
    <div className="ask-page">
      <header className="ask-page__header">
        <h1 className="ask-page__title">Ask Sortiri</h1>
        <p className="ask-page__subtitle">
          {auditReportId
            ? "Ask questions about evidence included in this audit report only."
            : impactAnalysisId
              ? "Ask questions about this impact analysis. Answers use cautious, non-causal language."
              : lessonId
                ? "Ask questions about this lesson. Answers use cautious, non-causal language."
                : playbookId
                  ? "Ask questions about this playbook and its validation steps."
                  : contextPackId
                    ? "Ask questions about this context pack. Answers prioritize lessons, failures, and validation."
                    : recommendationId
                      ? "Ask questions about this recommendation. Answers use recommendation evidence first with cautious language."
                      : evalSuiteId
                        ? "Ask what this private eval suite checks and which cases matter most."
                        : evalRunId
                          ? "Ask why this eval failed and what the agent should fix next."
                    : "Ask questions about your company timeline and get answers grounded in your events and workstreams."}
        </p>
        {selectedImpactAnalysis?.analysis ? (
          <p className="ask-page__context project-chip">
            Impact analysis: {selectedImpactAnalysis.analysis.title}
          </p>
        ) : null}
        {selectedLesson?.lesson ? (
          <p className="ask-page__context project-chip">
            Lesson: {selectedLesson.lesson.title}
          </p>
        ) : null}
        {selectedPlaybook?.playbook ? (
          <p className="ask-page__context project-chip">
            Playbook: {selectedPlaybook.playbook.title}
          </p>
        ) : null}
        {selectedContextPack?.pack ? (
          <p className="ask-page__context project-chip">
            Context pack: {selectedContextPack.pack.title}
          </p>
        ) : null}
        {selectedRecommendation ? (
          <p className="ask-page__context project-chip">
            Recommendation: {selectedRecommendation.title}
          </p>
        ) : null}
        {selectedEvalSuite?.suite ? (
          <p className="ask-page__context project-chip">
            Eval suite: {selectedEvalSuite.suite.title}
          </p>
        ) : null}
        {selectedEvalRun?.run ? (
          <p className="ask-page__context project-chip">
            Eval run: {selectedEvalRun.run.status}
            {selectedEvalRun.suite ? ` — ${selectedEvalRun.suite.title}` : ""}
          </p>
        ) : null}
        {selectedAuditReport ? (
          <p className="ask-page__context project-chip">
            Audit report: {selectedAuditReport.title}
          </p>
        ) : null}
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
            onChange={(value) => setQuestionDraft(value)}
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
