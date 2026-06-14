"use client";

import type { AskSession } from "@/types/ask";
import "./ask.css";

type AskHistoryProps = {
  sessions: AskSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
};

function truncateQuestion(question: string, max = 48): string {
  if (question.length <= max) return question;
  return `${question.slice(0, max - 1)}…`;
}

export function AskHistory({ sessions, activeSessionId, onSelect }: AskHistoryProps) {
  const completed = sessions.filter((session) => session.status === "completed");

  return (
    <aside className="ask-history">
      <h2 className="ask-history__title">Recent questions</h2>
      {completed.length === 0 ? (
        <p className="ask-history__empty">No questions yet.</p>
      ) : (
        <ul className="ask-history__list">
          {completed.map((session) => (
            <li key={session.id}>
              <button
                type="button"
                className={`ask-history__item${
                  activeSessionId === session.id ? " ask-history__item--active" : ""
                }`}
                onClick={() => onSelect(session.id)}
              >
                {truncateQuestion(session.question)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
