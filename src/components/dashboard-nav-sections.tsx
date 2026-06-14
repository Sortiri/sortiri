"use client";

import { dashboardNavSections } from "@/config/dashboard-nav";
import type { DashboardNavItem } from "@/config/dashboard-nav";
import { DashboardNavItem as DashboardNavItemComponent } from "@/components/dashboard-nav-item";
import { Fragment } from "react";
import { Stack } from "@/components/ui/stack";
import { Separator } from "@/components/ui/separator";

type DashboardNavSectionsProps = {
  onItemSelect?: () => void;
  viewItems?: DashboardNavItem[];
  replayItems?: DashboardNavItem[];
};

export function DashboardNavSections({
  onItemSelect,
  viewItems = [],
  replayItems = [],
}: DashboardNavSectionsProps) {
  const sections = dashboardNavSections.map((section) => {
    if (section.id === "replays") return { ...section, items: replayItems };
    if (section.id === "views") return { ...section, items: viewItems };
    return section;
  });

  return (
    <>
      {sections.map((section, index) => (
        <Fragment key={section.id}>
          {section.title && index > 0 ? (
            <Separator className="dashboard-sidebar-nav-separator" />
          ) : null}
          <div
            className={`dashboard-sidebar-nav-section dashboard-sidebar-nav-section--${section.id}`}
          >
            {section.title ? (
              <p className="dashboard-sidebar-nav-section-header">{section.title}</p>
            ) : null}
            {section.id === "views" && section.items.length === 0 ? (
              <p className="dashboard-sidebar-nav-section-empty">No pinned views</p>
            ) : null}
            {section.id === "replays" && section.items.length === 0 ? (
              <p className="dashboard-sidebar-nav-section-empty">No pinned replays</p>
            ) : null}
            {section.items.length > 0 ? (
              <Stack direction="block" gap="small-100">
                {section.items.map((item) => (
                  <DashboardNavItemComponent
                    key={item.href}
                    item={item}
                    onNavigate={onItemSelect}
                  />
                ))}
              </Stack>
            ) : null}
          </div>
        </Fragment>
      ))}
    </>
  );
}
