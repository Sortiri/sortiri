"use client";

import Link from "next/link";
import type { IntelligenceActivityItem, IntelligenceTab } from "@/types/intelligence-hub";
import "./intelligence.css";

const TYPE_LABELS: Record<IntelligenceActivityItem["type"], string> = {
  insight: "Insight",
  impact: "Impact",
  lesson: "Lesson",
  playbook: "Playbook",
};

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

type IntelligenceRecentActivityProps = {
  items: IntelligenceActivityItem[];
  activeTab: IntelligenceTab;
};

function tabMatchesItem(tab: IntelligenceTab, type: IntelligenceActivityItem["type"]): boolean {
  switch (tab) {
    case "insights":
      return type === "insight";
    case "impact":
      return type === "impact";
    case "lessons":
      return type === "lesson";
    case "playbooks":
      return type === "playbook";
  }
}

export function IntelligenceRecentActivity({
  items,
  activeTab,
}: IntelligenceRecentActivityProps) {
  const filtered =
    activeTab === "insights"
      ? items
      : items.filter((item) => tabMatchesItem(activeTab, item.type));

  return (
    <section className="intelligence-section">
      <h2 className="intelligence-section__title">Recent Intelligence</h2>
      {filtered.length === 0 ? (
        <p className="intelligence-activity__empty">
          No recent {activeTab === "insights" ? "intelligence" : activeTab} activity yet.
        </p>
      ) : (
        <div className="intelligence-activity">
          {filtered.map((item) => (
            <Link key={`${item.type}-${item.href}-${item.createdAt}`} href={item.href} className="intelligence-activity__item">
              <div className="intelligence-activity__meta">
                <p className="intelligence-activity__type">{TYPE_LABELS[item.type]}</p>
                <p className="intelligence-activity__date">{formatDate(item.createdAt)}</p>
              </div>
              <p className="intelligence-activity__title">{item.title}</p>
              <p className="intelligence-activity__summary">{item.summary}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function mapHubActivity(
  items: Array<{
    type: "insight" | "impact" | "lesson" | "playbook";
    title: string;
    summary: string;
    createdAt: number;
    href: string;
  }>,
): IntelligenceActivityItem[] {
  return items.map((item) => ({
    ...item,
    typeLabel: TYPE_LABELS[item.type],
  }));
}
