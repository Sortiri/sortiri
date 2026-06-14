"use client";

import type { KeyboardEvent } from "react";

const EXAMPLE_PROMPTS = [
  "What team changes happened recently?",
  "What happened today?",
  "What needs attention?",
  "Which workstreams are still active?",
  "What did the agent do yesterday?",
  "Why did the homepage change?",
  "What PRs were merged recently?",
  "Show me recent code changes.",
  "Did validation pass recently?",
  "What commands failed?",
  "What tests did the agent run?",
] as const;

type AskInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitting?: boolean;
};

export function AskInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  submitting = false,
}: AskInputProps) {
  const canSubmit = value.trim().length > 0 && !disabled && !submitting;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) {
        onSubmit();
      }
    }
  };

  return (
    <div className="ask-input">
      <textarea
        className="ask-input__textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your company timeline…"
        disabled={disabled || submitting}
        rows={4}
      />
      <div className="ask-input__actions">
        <div className="ask-input__chips">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="ask-input__chip"
              onClick={() => onChange(prompt)}
              disabled={disabled || submitting}
            >
              {prompt}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ask-input__submit"
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          {submitting ? "Thinking…" : "Ask"}
        </button>
      </div>
    </div>
  );
}
