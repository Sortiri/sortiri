"use client";

import {
  type DashboardNavItem,
  isDashboardNavItemActive,
} from "@/config/dashboard-nav";
import { usePathname, useRouter } from "next/navigation";
import { SidebarTooltip } from "@/components/dashboard/sidebar-tooltip";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { AppIcon } from "@/components/ui/icon";
import "./dashboard-sidebar-nav.css";

type DashboardNavItemProps = {
  item: DashboardNavItem;
  onNavigate?: () => void;
};

export function DashboardNavItem({ item, onNavigate }: DashboardNavItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed } = useSidebar();
  const active = isDashboardNavItemActive(pathname, item.href);

  const button = (
    <button
      type="button"
      className={`dashboard-sidebar-nav-item${active ? " is-active" : ""}`}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={() => {
        router.push(item.href);
        onNavigate?.();
      }}
    >
      <AppIcon
        type={item.icon}
        tone={active ? "brand" : "neutral"}
        solid={active}
        size="small"
      />
      <span className="dashboard-sidebar-nav-label">{item.label}</span>
    </button>
  );

  if (!collapsed) {
    return button;
  }

  return <SidebarTooltip label={item.label}>{button}</SidebarTooltip>;
}
