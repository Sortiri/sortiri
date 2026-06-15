"use client";

import { getNavItemsForRole } from "@/config/dashboard-nav";
import { DashboardBottomNavItem } from "@/components/dashboard-bottom-nav-item";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import "./dashboard-bottom-nav.css";

export function DashboardBottomNav() {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const items = getNavItemsForRole(capabilities?.role);

  return (
    <nav className="dashboard-bottom-nav" aria-label="Main">
      <div className="dashboard-bottom-nav-inner">
        {items.map((item) => (
          <DashboardBottomNavItem key={item.href} item={item} />
        ))}
      </div>
    </nav>
  );
}
