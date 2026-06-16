"use client";

import { departureMono } from "@/lib/landing-fonts";

const MONO = departureMono.className;

export type CodeTabItem = {
  id: string;
  label: string;
};

type CodeTabsProps = {
  tabs: readonly CodeTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  compact?: boolean;
};

export function CodeTabs({ tabs, activeId, onChange, compact = false }: CodeTabsProps) {
  return (
    <div
      className={`code-card__tabs${compact ? " code-card__tabs--compact" : ""}`}
      role="tablist"
      aria-label="Code examples"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`code-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`code-panel-${tab.id}`}
            className={`${MONO} code-card__tab${isActive ? " code-card__tab--active" : ""}${
              compact ? " code-card__tab--compact" : ""
            }`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
