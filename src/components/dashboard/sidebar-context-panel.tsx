"use client";

import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import "./sidebar-context-panel.css";

type SidebarContextPanelProps = {
  className?: string;
};

export function SidebarContextPanel({ className }: SidebarContextPanelProps) {
  return (
    <div className={["sidebar-context-panel", className].filter(Boolean).join(" ")}>
      <WorkspaceSwitcher variant="context" />
    </div>
  );
}
