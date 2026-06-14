export type DashboardNavIcon =
  | "home"
  | "timeline"
  | "projects"
  | "workstreams"
  | "entities"
  | "ask"
  | "insights"
  | "sources"
  | "settings";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: DashboardNavIcon;
};

export type DashboardNavSection = {
  id: string;
  title?: string;
  items: DashboardNavItem[];
};

export const dashboardPrimaryNavItems: DashboardNavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/timeline", label: "Timeline", icon: "timeline" },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/workstreams", label: "Workstreams", icon: "workstreams" },
  { href: "/entities", label: "Entities", icon: "entities" },
  { href: "/ask", label: "Ask Sortiri", icon: "ask" },
  { href: "/insights", label: "Insights", icon: "insights" },
  { href: "/sources", label: "Sources", icon: "sources" },
];

export const dashboardSettingsNavItem: DashboardNavItem = {
  href: "/settings",
  label: "Settings",
  icon: "settings",
};

export const dashboardNavSections: DashboardNavSection[] = [
  { id: "primary", items: dashboardPrimaryNavItems },
  { id: "replays", title: "YOUR REPLAYS", items: [] },
];

export const dashboardNavItems: DashboardNavItem[] = [
  ...dashboardPrimaryNavItems,
  dashboardSettingsNavItem,
];

export const dashboardBottomNavItems = dashboardPrimaryNavItems;

export function isDashboardNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getDashboardPageTitle(pathname: string): string {
  if (pathname === "/home") return "Company Pulse";
  if (pathname.startsWith("/settings")) return "Settings";
  const match = dashboardNavItems.find((item) =>
    isDashboardNavItemActive(pathname, item.href),
  );
  return match?.label ?? "Sortiri";
}
