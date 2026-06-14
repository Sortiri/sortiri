"use client";

type TimelineEmptyStateProps = {
  onSeed?: () => void;
  seeding?: boolean;
  showSeedAction?: boolean;
};

export function TimelineEmptyState({
  onSeed,
  seeding = false,
  showSeedAction = false,
}: TimelineEmptyStateProps) {
  return (
    <div className="timeline-empty-state">
      <p className="timeline-empty-state__title">No events yet.</p>
      <p className="timeline-empty-state__body">
        Install the Sortiri MCP or add a sample event to start building your company
        timeline.
      </p>
      {showSeedAction && onSeed ? (
        <button
          type="button"
          className="timeline-empty-state__action"
          onClick={onSeed}
          disabled={seeding}
        >
          {seeding ? "Adding…" : "Add sample events"}
        </button>
      ) : null}
    </div>
  );
}
