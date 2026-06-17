"use client";

import { ASK_SUGGESTION_GROUPS } from "@/lib/platform/suggestion-groups";

type AskSuggestionGroupsProps = {
  onSelect: (question: string) => void;
  disabled?: boolean;
};

export function AskSuggestionGroups({ onSelect, disabled = false }: AskSuggestionGroupsProps) {
  return (
    <div className="ask-suggestion-groups">
      {ASK_SUGGESTION_GROUPS.map((group) => (
        <section key={group.id} className="ask-suggestion-group">
          <h3 className="ask-suggestion-group__title">{group.title}</h3>
          <div className="ask-suggestion-group__chips">
            {group.questions.map((question) => (
              <button
                key={question}
                type="button"
                className="ask-input__chip"
                onClick={() => onSelect(question)}
                disabled={disabled}
              >
                {question}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
