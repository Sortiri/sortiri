"use client";

import type { KeyboardEvent } from "react";
import { AskSuggestionGroups } from "@/components/ask/ask-suggestion-groups";

type AskInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitting?: boolean;
  showSuggestions?: boolean;
};

export function AskInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  submitting = false,
  showSuggestions = true,
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
        aria-label="Ask about your company timeline"
      />
      <div className="ask-input__actions">
        {showSuggestions ? (
          <AskSuggestionGroups
            onSelect={onChange}
            disabled={disabled || submitting}
          />
        ) : null}
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
