"use client";

import { EmptyState } from "@/components/platform";

export function IntelligenceEmptyState() {
  return (
    <EmptyState
      title="Intelligence is warming up"
      body="Your intelligence layer will appear here once Sortiri has enough timeline data to detect signals, analyze impact, generate lessons, and create playbooks."
      actions={[
        { label: "Open Timeline", href: "/timeline" },
        { label: "Create Impact Analysis", href: "/impact" },
        { label: "Open Sources", href: "/sources" },
      ]}
    />
  );
}
