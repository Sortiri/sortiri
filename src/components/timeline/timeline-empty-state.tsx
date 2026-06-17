"use client";

import { EmptyState } from "@/components/platform";

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
  const actions =
    showSeedAction && onSeed
      ? [
          {
            label: seeding ? "Adding…" : "Add sample events",
            onClick: onSeed,
            disabled: seeding,
          },
        ]
      : undefined;

  return (
    <EmptyState
      title="No events yet"
      body="Install the Sortiri MCP or add a sample event to start building your company timeline."
      actions={actions}
    />
  );
}
