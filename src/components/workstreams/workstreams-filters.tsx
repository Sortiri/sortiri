"use client";

import type { WorkstreamFilterValue } from "@/lib/workstreams/labels";
import { FILTER_TABS } from "@/lib/workstreams/labels";

type WorkstreamsFiltersProps = {
  value: WorkstreamFilterValue;
  onChange: (value: WorkstreamFilterValue) => void;
};

export function WorkstreamsFilters({ value, onChange }: WorkstreamsFiltersProps) {
  return (
    <div className="workstreams-filters" role="tablist" aria-label="Filter workstreams by status">
      {FILTER_TABS.map((tab) => {
        const isActive = value === tab.value;
        return (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`workstreams-filter${isActive ? " is-active" : ""}`}
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
