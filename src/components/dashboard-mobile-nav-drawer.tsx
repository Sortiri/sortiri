"use client";

import { Close } from "pixelarticons/react/Close";
import { useCallback, useEffect, useId, type MouseEvent } from "react";
import { Stack } from "@/components/ui/stack";
import { SidebarContextPanel } from "@/components/dashboard/sidebar-context-panel";
import { DashboardNavSections } from "@/components/dashboard-nav-sections";
import "./dashboard-mobile.css";

type DashboardMobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function DashboardMobileNavDrawer({
  open,
  onClose,
}: DashboardMobileNavDrawerProps) {
  const titleId = useId();

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="dashboard-mobile-nav-drawer-root">
      <div
        className="dashboard-mobile-nav-drawer-backdrop"
        role="presentation"
        onClick={handleBackdropClick}
      />
      <aside
        id="dashboard-mobile-nav-drawer"
        className="dashboard-mobile-nav-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="dashboard-mobile-nav-drawer-header">
          <h2 id={titleId} className="dashboard-mobile-nav-drawer-title">
            Navigation
          </h2>
          <button
            type="button"
            className="dashboard-mobile-nav-drawer-close"
            aria-label="Close navigation menu"
            onClick={onClose}
          >
            <Close width={20} height={20} className="app-icon" aria-hidden />
          </button>
        </div>

        <div className="dashboard-mobile-nav-drawer-body">
          <SidebarContextPanel />
          <Stack direction="block" gap="small-100">
            <DashboardNavSections onItemSelect={onClose} />
          </Stack>
        </div>
      </aside>
    </div>
  );
}
