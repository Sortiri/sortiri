"use client";

import { DashboardBottomNav } from "@/components/dashboard-bottom-nav";
import { DashboardMobileHeader } from "@/components/dashboard-mobile-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SidebarProvider, useSidebar } from "@/components/dashboard/sidebar-context";
import { OnboardingGuard } from "@/components/onboarding/onboarding-guard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceProvider } from "@/components/workspace/workspace-context";

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div
      className="dashboard-shell dashboard-app"
      data-sidebar-collapsed={collapsed ? "true" : "false"}
    >
      <aside className="dashboard-sidebar" aria-label="Main navigation">
        <DashboardSidebar />
      </aside>
      <div className="dashboard-body">
        <DashboardMobileHeader />
        <main className="dashboard-main" id="dashboard-main">
          <div className="dashboard-main-inner">
            <div className="dashboard-page">
              <OnboardingGuard>{children}</OnboardingGuard>
            </div>
          </div>
        </main>
        <DashboardBottomNav />
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <DashboardShellInner>{children}</DashboardShellInner>
        </TooltipProvider>
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
