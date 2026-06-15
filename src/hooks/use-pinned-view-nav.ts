"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { DashboardNavItem } from "@/config/dashboard-nav";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";

export function usePinnedViewNavItems(): DashboardNavItem[] {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const isAuditor = capabilities?.role === "auditor";

  const views = useQuery(
    api.savedViews.listByWorkspace,
    activeWorkspaceId && !isAuditor ? { workspaceId: activeWorkspaceId } : "skip",
  );

  return useMemo(
    () =>
      (views ?? [])
        .filter((view) => view.isPinned)
        .slice(0, 10)
        .map((view) => ({
          href: `/views/${view.id}`,
          label: view.name,
          icon: "views" as const,
        })),
    [views],
  );
}
