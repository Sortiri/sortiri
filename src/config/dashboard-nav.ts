import type { WorkspaceRole } from "@/types/workspace-members";

export type DashboardNavIcon =
  | "home"
  | "timeline"
  | "projects"
  | "workstreams"
  | "entities"
  | "views"
  | "intelligence"
  | "ask"
  | "audits"
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

export const INTELLIGENCE_NAV_HREF = "/intelligence";

export const INTELLIGENCE_CHILD_PREFIXES = [
  "/intelligence",
  "/insights",
  "/impact",
  "/lessons",
  "/playbooks",
  "/recommendations",
  "/intelligence/evals",
] as const;

const INTELLIGENCE_CHILD_LABELS: { prefix: string; label: string }[] = [
  { prefix: "/intelligence/queue", label: "Autonomy Queue" },
  { prefix: "/intelligence/evals", label: "Private Evals" },
  { prefix: "/recommendations", label: "Recommendation" },
  { prefix: "/insights", label: "Insights" },
  { prefix: "/impact", label: "Impact" },
  { prefix: "/lessons", label: "Lessons" },
  { prefix: "/playbooks", label: "Playbooks" },
];

export function isIntelligenceRoute(pathname: string): boolean {
  return INTELLIGENCE_CHILD_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const dashboardPrimaryNavItems: DashboardNavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/timeline", label: "Timeline", icon: "timeline" },
  { href: "/workstreams", label: "Workstreams", icon: "workstreams" },
  { href: "/intelligence", label: "Intelligence", icon: "intelligence" },
  { href: "/sources", label: "Sources", icon: "sources" },
  { href: "/audits", label: "Audits", icon: "audits" },
  { href: "/ask", label: "Ask Sortiri", icon: "ask" },
];

export const auditorNavItems: DashboardNavItem[] = [
  { href: "/audits", label: "Audits", icon: "audits" },
];

export function getNavItemsForRole(role: WorkspaceRole | null | undefined): DashboardNavItem[] {
  if (role === "auditor") {
    return auditorNavItems;
  }
  return dashboardPrimaryNavItems;
}

export const dashboardSettingsNavItem: DashboardNavItem = {
  href: "/settings",
  label: "Settings",
  icon: "settings",
};

export const dashboardNavSections: DashboardNavSection[] = [
  { id: "primary", items: dashboardPrimaryNavItems },
  { id: "views", title: "VIEWS", items: [] },
  { id: "replays", title: "YOUR REPLAYS", items: [] },
];

export const dashboardNavItems: DashboardNavItem[] = [
  ...dashboardPrimaryNavItems,
  dashboardSettingsNavItem,
];

export const dashboardBottomNavItems = dashboardPrimaryNavItems.slice(0, 5);

export function isDashboardNavItemActive(pathname: string, href: string): boolean {
  if (href === INTELLIGENCE_NAV_HREF) {
    return isIntelligenceRoute(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getDashboardPageTitle(pathname: string): string {
  if (pathname === "/home") return "Timeline";
  if (pathname.startsWith("/views")) return "Views";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/audits")) return "Audits";
  if (pathname === INTELLIGENCE_NAV_HREF || pathname.startsWith(`${INTELLIGENCE_NAV_HREF}/`)) {
    return "Intelligence";
  }
  for (const child of INTELLIGENCE_CHILD_LABELS) {
    if (pathname === child.prefix || pathname.startsWith(`${child.prefix}/`)) {
      return child.label;
    }
  }
  const match = dashboardNavItems.find((item) =>
    isDashboardNavItemActive(pathname, item.href),
  );
  return match?.label ?? "Sortiri";
}
