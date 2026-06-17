"use client";

import { DashboardShell } from "@/components/dashboard-shell";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <a href="#dashboard-main" className="platform-skip-link">
        Skip to content
      </a>
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}
