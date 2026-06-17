"use client";

import Link from "next/link";
import {
  TimelineDensityToggle,
  type TimelineDensity,
} from "@/components/timeline/timeline-density-toggle";
import type { TimelineFilterValue } from "@/lib/events/labels";
import { FILTER_OPTIONS } from "@/lib/events/labels";
import type { TimelineViewMode } from "@/lib/events/display";

type TimelineFiltersProps = {
  value: TimelineFilterValue;
  onChange: (value: TimelineFilterValue) => void;
  viewMode?: TimelineViewMode;
  onViewModeChange?: (mode: TimelineViewMode) => void;
  density?: TimelineDensity;
  onDensityChange?: (density: TimelineDensity) => void;
  hideHubLinks?: boolean;
};

const VIEW_MODE_OPTIONS: { label: string; value: TimelineViewMode }[] = [
  { label: "Primary", value: "primary" },
  { label: "Raw", value: "raw" },
];

export function TimelineFilters({
  value,
  onChange,
  viewMode = "primary",
  onViewModeChange,
  density = "comfortable",
  onDensityChange,
  hideHubLinks = false,
}: TimelineFiltersProps) {
  return (
    <div className="timeline-filters-stack">
      {onDensityChange ? (
        <TimelineDensityToggle value={density} onChange={onDensityChange} />
      ) : null}
      {onViewModeChange ? (
        <div className="timeline-view-mode">
          <div
            className="timeline-filters timeline-view-mode__controls"
            role="tablist"
            aria-label="Timeline view mode"
          >
            {VIEW_MODE_OPTIONS.map((option) => {
              const isActive = viewMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`timeline-filter timeline-view-mode__option${isActive ? " is-active" : ""}`}
                  onClick={() => onViewModeChange(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="timeline-view-mode__hint">
            Primary shows meaningful company history. Raw shows every captured event.
          </p>
        </div>
      ) : null}
      <div className="timeline-filters" role="tablist" aria-label="Filter events by category">
        {!hideHubLinks ? (
          <>
            <Link href="/timeline/decisions" className="timeline-filter timeline-filter--link">
              Decisions hub
            </Link>
            <Link href="/timeline/incidents" className="timeline-filter timeline-filter--link">
              Incidents hub
            </Link>
          </>
        ) : null}
        {FILTER_OPTIONS.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`timeline-filter${isActive ? " is-active" : ""}`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
