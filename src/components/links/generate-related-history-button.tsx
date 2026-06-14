"use client";

import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { InsightWindow } from "@/types/insights";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import "./related-history.css";

type GenerateRelatedHistoryButtonProps = {
  workspaceId: string;
  defaultWindow?: InsightWindow;
  compact?: boolean;
};

const WINDOW_OPTIONS: { label: string; value: InsightWindow }[] = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

export function GenerateRelatedHistoryButton({
  workspaceId,
  defaultWindow = "7d",
  compact = false,
}: GenerateRelatedHistoryButtonProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const [window, setWindow] = useState<InsightWindow>(defaultWindow);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useMutation(api.eventLinks.generateForWorkspace);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setMessage(null);
    setGenerating(true);
    try {
      const result = await generate({ workspaceId, window });
      setMessage(
        `Created ${result.created} related history link${result.created === 1 ? "" : "s"}${
          result.skipped > 0 ? ` (${result.skipped} skipped as duplicates)` : ""
        }.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate related history");
    } finally {
      setGenerating(false);
    }
  }, [generate, workspaceId, window]);

  if (!canWrite) {
    return null;
  }

  return (
    <div className="generate-links">
      {!compact ? (
        <div className="generate-links__window">
          {WINDOW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`generate-links__window-button${
                window === option.value ? " generate-links__window-button--active" : ""
              }`}
              onClick={() => setWindow(option.value)}
              disabled={generating}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="generate-links__button"
        onClick={() => void handleGenerate()}
        disabled={generating}
      >
        {generating ? "Generating…" : "Generate related history"}
      </button>
      {message ? <p className="generate-links__message">{message}</p> : null}
      {error ? <p className="generate-links__error">{error}</p> : null}
    </div>
  );
}
