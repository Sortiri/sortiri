"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { IntelligenceTab } from "@/types/intelligence-hub";
import {
  INTELLIGENCE_TAB_DESCRIPTIONS,
  INTELLIGENCE_TAB_LABELS,
  parseIntelligenceTab,
} from "@/types/intelligence-hub";
import "./intelligence.css";

const TABS: IntelligenceTab[] = ["insights", "impact", "lessons", "playbooks"];

type IntelligenceTabsProps = {
  activeTab: IntelligenceTab;
};

export function IntelligenceTabs({ activeTab }: IntelligenceTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setTab = (tab: IntelligenceTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "insights") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `/intelligence?${query}` : "/intelligence");
  };

  return (
    <div className="intelligence-tab-panel">
      <div className="intelligence-tabs" role="tablist" aria-label="Intelligence areas">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`intelligence-tab${activeTab === tab ? " is-active" : ""}`}
            onClick={() => setTab(tab)}
          >
            {INTELLIGENCE_TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      <p className="intelligence-tab-panel__description">
        {INTELLIGENCE_TAB_DESCRIPTIONS[activeTab]}
      </p>
    </div>
  );
}

export function useIntelligenceTab(): IntelligenceTab {
  const searchParams = useSearchParams();
  return parseIntelligenceTab(searchParams.get("tab"));
}
