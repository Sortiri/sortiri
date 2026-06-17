"use client";

import { PlatformEmptyState } from "@/components/platform";

type WorkstreamsEmptyStateProps = {
  variant?: "empty" | "no-matches";
  onSeed?: () => void;
  seeding?: boolean;
  showSeedAction?: boolean;
};

export function WorkstreamsEmptyState({
  variant = "empty",
  onSeed,
  seeding = false,
  showSeedAction = false,
}: WorkstreamsEmptyStateProps) {
  if (variant === "no-matches") {
    return (
      <PlatformEmptyState
        title="No matching workstreams"
        body="Try adjusting your search or status filter."
      />
    );
  }

  const actions = [
    { label: "Set up MCP", href: "/sources#connections" },
    { label: "Install CLI", href: "/sources#connections" },
    ...(showSeedAction && onSeed
      ? [
          {
            label: seeding ? "Adding…" : "Add sample workstreams",
            onClick: onSeed,
            disabled: seeding,
          },
        ]
      : []),
  ];

  return (
    <PlatformEmptyState
      title="No workstreams yet"
      body="Workstreams are replayable agent tasks. Connect Cursor MCP or run the CLI to start recording agent work."
      actions={actions}
    />
  );
}
