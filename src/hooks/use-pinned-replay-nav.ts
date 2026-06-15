"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { DashboardNavItem } from "@/config/dashboard-nav";
import { truncateWorkstreamTitle } from "@/lib/workstreams/format";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";

export function usePinnedReplayNavItems(): DashboardNavItem[] {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const isAuditor = capabilities?.role === "auditor";

  const pinned = useQuery(
    api.pinnedReplays.listByWorkspace,
    activeWorkspaceId && !isAuditor
      ? { workspaceId: activeWorkspaceId, limit: 10 }
      : "skip",
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
