"use client";

import { AskEvidence } from "@/components/ask/ask-evidence";
import type { AskEvidenceEvent, AskEvidenceWorkstream } from "@/types/ask";
import "./ask.css";

const INSUFFICIENT_PATTERNS = [
  /not enough/i,
  /insufficient/i,
  /don't have enough/i,
  /do not have enough/i,
  /missing information/i,
  /no information/i,
  /cannot find/i,
  /can't find/i,
];

type AskAnswerProps = {
  question: string;
  answer?: string;
  loading?: boolean;
  error?: string | null;
  evidenceEvents?: AskEvidenceEvent[];
  evidenceWorkstreams?: AskEvidenceWorkstream[];
};

function suggestsInsufficientEvidence(answer: string): boolean {
  return INSUFFICIENT_PATTERNS.some((pattern) => pattern.test(answer));
}

export function AskAnswer({
  question,
  answer,
  loading = false,
  error = null,
  evidenceEvents = [],
  evidenceWorkstreams = [],
}: AskAnswerProps) {
  if (!question && !loading && !error) {
    return null;
  }

  const showInsufficientHint =
    answer && suggestsInsufficientEvidence(answer) && evidenceEvents.length === 0;

  return (
    <div className="ask-answer">
      <p className="ask-answer__question-label">Question</p>
      <p className="ask-answer__question">{question}</p>

      {loading ? <p className="ask-answer__status">Thinking…</p> : null}
      {error ? <p className="ask-answer__error">{error}</p> : null}

      {answer ? (
        <>
          <p className="ask-answer__body">{answer}</p>
          {showInsufficientHint ? (
            <p className="ask-answer__insufficient">
              Try installing the Sortiri MCP, running the file watcher, or asking about a
              specific workstream replay.
            </p>
          ) : null}
          <AskEvidence events={evidenceEvents} workstreams={evidenceWorkstreams} />
        </>
      ) : null}
    </div>
  );
}
