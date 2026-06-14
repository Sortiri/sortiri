"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { DashboardNavItem } from "@/config/dashboard-nav";
import { truncateWorkstreamTitle } from "@/lib/workstreams/format";
import { useWorkspace } from "@/components/workspace/workspace-context";

export function usePinnedReplayNavItems(): DashboardNavItem[] {
  const { activeWorkspaceId } = useWorkspace();

  const pinned = useQuery(
    api.pinnedReplays.listByWorkspace,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, limit: 10 } : "skip",
  );

  return useMemo(
    () =>
      (pinned ?? []).map((item) => ({
        href: `/workstreams/${item.workstream.id}`,
        label: truncateWorkstreamTitle(item.workstream.title),
        icon: "workstreams" as const,
      })),
    [pinned],
  );
}
