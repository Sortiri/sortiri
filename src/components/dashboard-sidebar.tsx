"use client";

import { UserButton } from "@clerk/nextjs";
import { ChevronLeft } from "pixelarticons/react/ChevronLeft";
import { ChevronRight } from "pixelarticons/react/ChevronRight";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { Separator } from "@/components/ui/separator";
import { Stack } from "@/components/ui/stack";
import { SidebarTooltip } from "@/components/dashboard/sidebar-tooltip";
import { useSearch } from "@/components/search/search-provider";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { SidebarContextPanel } from "@/components/dashboard/sidebar-context-panel";
import { DashboardNavItem } from "@/components/dashboard-nav-item";
import { DashboardNavSections } from "@/components/dashboard-nav-sections";
import { dashboardSettingsNavItem, getNavItemsForRole } from "@/config/dashboard-nav";
import { usePinnedReplayNavItems } from "@/hooks/use-pinned-replay-nav";
import { usePinnedViewNavItems } from "@/hooks/use-pinned-view-nav";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import "@/components/search/search.css";

export function DashboardSidebar() {
  const router = useRouter();
  const { collapsed, toggle } = useSidebar();
  const { setOpen } = useSearch();
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const replayItems = usePinnedReplayNavItems();
  const viewItems = usePinnedViewNavItems();
  const primaryItems = getNavItemsForRole(capabilities?.role);
  const showSettings = capabilities?.canAccessWorkspaceNav ?? true;

  return (
    <div className="dashboard-sidebar-panel">
      <div className="dashboard-sidebar-inner">
        <div className="dashboard-sidebar-stack">
          <div className="dashboard-sidebar-header">
            {collapsed ? (
              <SidebarTooltip label="Expand sidebar">
                <button
                  type="button"
                  className="dashboard-sidebar-toggle"
                  aria-label="Expand sidebar"
                  aria-expanded={false}
                  onClick={toggle}
                >
                  <ChevronRight width={16} height={16} className="app-icon" aria-hidden />
                </button>
              </SidebarTooltip>
            ) : (
              <>
                <button
                  type="button"
                  className="dashboard-sidebar-brand"
                  aria-label="Sortiri home"
                  onClick={() => router.push("/home")}
                >
                  <BrandLogo size="sm" />
                </button>
                <button
                  type="button"
                  className="dashboard-sidebar-toggle"
                  aria-label="Collapse sidebar"
                  aria-expanded
                  onClick={toggle}
                >
                  <ChevronLeft width={16} height={16} className="app-icon" aria-hidden />
                </button>
              </>
            )}
          </div>

          <SidebarContextPanel />

          <SidebarTooltip label="Search">
            <button
              type="button"
              className={`dashboard-sidebar-search${collapsed ? " dashboard-sidebar-search--collapsed" : ""}`}
              onClick={() => setOpen(true)}
              aria-label="Search"
            >
              <span className="dashboard-sidebar-search__label">Search</span>
              {!collapsed ? (
                <span className="dashboard-sidebar-search__shortcut">⌘K</span>
              ) : null}
            </button>
          </SidebarTooltip>

          <Stack direction="block" gap="small-100" className="dashboard-sidebar-primary-nav">
            <DashboardNavSections
              viewItems={capabilities?.canAccessWorkspaceNav ? viewItems : []}
              replayItems={capabilities?.canAccessWorkspaceNav ? replayItems : []}
              primaryItems={primaryItems}
            />
          </Stack>

          <div className="dashboard-sidebar-footer">
            {showSettings ? <DashboardNavItem item={dashboardSettingsNavItem} /> : null}
            {showSettings ? <Separator className="dashboard-sidebar-separator" /> : null}
            <div className="dashboard-sidebar-account">
              <UserButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
