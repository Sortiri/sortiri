"use client";

import {
  type DashboardNavItem,
  isDashboardNavItemActive,
} from "@/config/dashboard-nav";
import { usePathname, useRouter } from "next/navigation";
import { AppIcon } from "@/components/ui/icon";

type DashboardBottomNavItemProps = {
  item: DashboardNavItem;
};

export function DashboardBottomNavItem({ item }: DashboardBottomNavItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const active = isDashboardNavItemActive(pathname, item.href);

  return (
    <button
      type="button"
      className={`dashboard-bottom-nav-tab${active ? " is-active" : ""}`}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={() => router.push(item.href)}
    >
      <AppIcon
        type={item.icon}
        tone={active ? "brand" : "neutral"}
        solid={active}
        size="small"
      />
      <span className="dashboard-bottom-nav-tab-label">{item.label}</span>
    </button>
  );
}
