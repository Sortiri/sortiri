"use client";

import Link from "next/link";

type WorkstreamsEmptyStateProps = {
  onSeed?: () => void;
  seeding?: boolean;
  showSeedAction?: boolean;
};

export function WorkstreamsEmptyState({
  onSeed,
  seeding = false,
  showSeedAction = false,
}: WorkstreamsEmptyStateProps) {
  return (
    <div className="workstreams-empty-state">
      <p className="workstreams-empty-state__title">No workstreams yet.</p>
      <p className="workstreams-empty-state__body">
        Start a task with the Sortiri MCP and your agent will create a replayable
        history here.
      </p>
      <div className="workstreams-empty-state__actions">
        <Link href="/timeline" className="workstreams-empty-state__action">
          View Timeline
        </Link>
        {showSeedAction && onSeed ? (
          <button
            type="button"
            className="workstreams-empty-state__action"
            onClick={onSeed}
            disabled={seeding}
          >
            {seeding ? "Adding…" : "Add sample workstreams"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
