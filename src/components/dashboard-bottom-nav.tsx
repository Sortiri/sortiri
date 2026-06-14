"use client";

import { dashboardBottomNavItems } from "@/config/dashboard-nav";
import { DashboardBottomNavItem } from "@/components/dashboard-bottom-nav-item";
import "./dashboard-bottom-nav.css";

export function DashboardBottomNav() {
  return (
    <nav className="dashboard-bottom-nav" aria-label="Main">
      <div className="dashboard-bottom-nav-inner">
        {dashboardBottomNavItems.map((item) => (
          <DashboardBottomNavItem key={item.href} item={item} />
        ))}
      </div>
    </nav>
  );
}
