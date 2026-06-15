export type IntelligenceTab = "insights" | "impact" | "lessons" | "playbooks";

export type IntelligenceAreaSummary = {
  tab: IntelligenceTab;
  label: string;
  count: number;
  countLabel: string;
  description: string;
  href: string;
  latestTitle?: string;
  latestAt?: number;
};

export type IntelligenceActivityType = "insight" | "impact" | "lesson" | "playbook";

export type IntelligenceActivityItem = {
  type: IntelligenceActivityType;
  typeLabel: string;
  title: string;
  summary: string;
  createdAt: number;
  href: string;
};

export type IntelligenceHubData = {
  summaries: IntelligenceAreaSummary[];
  recentActivity: IntelligenceActivityItem[];
  isEmpty: boolean;
};

export const INTELLIGENCE_TAB_LABELS: Record<IntelligenceTab, string> = {
  insights: "Insights",
  impact: "Impact",
  lessons: "Lessons",
  playbooks: "Playbooks",
};

export const INTELLIGENCE_TAB_DESCRIPTIONS: Record<IntelligenceTab, string> = {
  insights: "Signals Sortiri found across your company timeline.",
  impact:
    "Before/after analysis for workstreams, PRs, decisions, projects, and product changes.",
  lessons: "Evidence-backed learnings from impact analyses, decisions, and failures.",
  playbooks: "Reusable operating patterns created from lessons.",
};

export const INTELLIGENCE_TAB_HREFS: Record<IntelligenceTab, string> = {
  insights: "/insights",
  impact: "/impact",
  lessons: "/lessons",
  playbooks: "/playbooks",
};

export function parseIntelligenceTab(value: string | null | undefined): IntelligenceTab {
  if (value === "impact" || value === "lessons" || value === "playbooks") {
    return value;
  }
  return "insights";
}
