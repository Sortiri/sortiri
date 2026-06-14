"use client";

import { Fragment } from "react";
import { Stack } from "@/components/ui/stack";
import { Separator } from "@/components/ui/separator";
import { dashboardNavSections } from "@/config/dashboard-nav";
import { DashboardNavItem } from "@/components/dashboard-nav-item";

type DashboardNavSectionsProps = {
  onItemSelect?: () => void;
};

export function DashboardNavSections({ onItemSelect }: DashboardNavSectionsProps) {
  return (
    <>
      {dashboardNavSections.map((section, index) => (
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
            {section.items.length > 0 ? (
              <Stack direction="block" gap="small-100">
                {section.items.map((item) => (
                  <DashboardNavItem
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
