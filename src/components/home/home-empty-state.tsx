"use client";

import { EmptyState } from "@/components/platform";

export function HomeEmptyState() {
  return (
    <EmptyState
      title="Start building your company timeline"
      body="No company history recorded yet. Install the SDK, CLI, or MCP server to start recording agent actions, decisions, product events, and incidents."
      actions={[
        { label: "Open Sources", href: "/sources" },
        { label: "Create API Key", href: "/api-keys" },
        { label: "View Projects", href: "/projects" },
      ]}
    />
  );
}
