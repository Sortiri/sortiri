"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import "./pin-replay-button.css";

type PinReplayButtonProps = {
  workspaceId: string;
  workstreamId: string;
  compact?: boolean;
};

export function PinReplayButton({
  workspaceId,
  workstreamId,
  compact = false,
}: PinReplayButtonProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const [error, setError] = useState<string | null>(null);
  const pinState = useQuery(
    api.pinnedReplays.isPinned,
    workspaceId
      ? {
          workspaceId,
          workstreamId: workstreamId as Id<"workstreams">,
        }
      : "skip",
  );
  const toggle = useMutation(api.pinnedReplays.toggle);

  const handleClick = useCallback(async () => {
    setError(null);
    try {
      await toggle({
        workspaceId,
        workstreamId: workstreamId as Id<"workstreams">,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update pin");
    }
  }, [toggle, workspaceId, workstreamId]);

  const pinned = pinState?.pinned ?? false;
  const loading = pinState === undefined;

  if (!canWrite) {
    return null;
  }

  return (
    <div className="pin-replay-button-wrap">
      <button
        type="button"
        className={`pin-replay-button${pinned ? " pin-replay-button--pinned" : ""}${
          compact ? " pin-replay-button--compact" : ""
        }`}
        onClick={() => void handleClick()}
        disabled={loading}
        aria-pressed={pinned}
      >
        {pinned ? "Unpin" : "Pin Replay"}
      </button>
      {error ? <p className="pin-replay-button__error">{error}</p> : null}
    </div>
  );
}
