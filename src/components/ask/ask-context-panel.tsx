"use client";

import Link from "next/link";

export type AskContextOption = {
  id: string;
  label: string;
  href: string;
  active?: boolean;
};

type AskContextPanelProps = {
  options: AskContextOption[];
  recentQuestions?: { id: string; question: string; onSelect: () => void }[];
};

export function AskContextPanel({ options, recentQuestions }: AskContextPanelProps) {
  return (
    <aside className="ask-context-panel" aria-label="Ask context">
      <div>
        <h2 className="ask-suggestion-group__title">Context</h2>
        <div className="ask-suggestion-group__chips">
          {options.map((option) => (
            <Link
              key={option.id}
              href={option.href}
              className={`ask-input__chip${option.active ? " is-active" : ""}`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>
      {recentQuestions && recentQuestions.length > 0 ? (
        <div>
          <h2 className="ask-suggestion-group__title">Recent questions</h2>
          <div className="ask-suggestion-group__chips">
            {recentQuestions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="ask-input__chip"
                onClick={item.onSelect}
              >
                {item.question}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
