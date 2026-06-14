"use client";

import type { InsightWindow } from "@/types/insights";
import "./insights.css";

const OPTIONS: { label: string; value: InsightWindow }[] = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

type InsightsWindowFilterProps = {
  value: InsightWindow;
  onChange: (value: InsightWindow) => void;
};

export function InsightsWindowFilter({ value, onChange }: InsightsWindowFilterProps) {
  return (
    <div className="insights-window-filter">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`insights-window-filter__button${
            value === option.value ? " insights-window-filter__button--active" : ""
          }`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
