"use client";

import type { ReactNode } from "react";

type HealthItem = {
  label: string;
  value: ReactNode;
};

type SourcesHealthSummaryProps = {
  items: HealthItem[];
};

export function SourcesHealthSummary({ items }: SourcesHealthSummaryProps) {
  return (
    <div className="sources-health-summary" aria-label="Source health summary">
      {items.map((item) => (
        <div key={item.label} className="sources-health-summary__item">
          <div className="sources-health-summary__value">{item.value}</div>
          <div className="sources-health-summary__label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
