"use client";

import type {
  RecommendationPriority,
  RecommendationQueueFilters,
  RecommendationSource,
  RecommendationStatus,
} from "@/types/recommendations";
import "./recommendations.css";

type RecommendationFiltersProps = {
  filters: RecommendationQueueFilters;
  onChange: (filters: RecommendationQueueFilters) => void;
};

export function RecommendationFilters({ filters, onChange }: RecommendationFiltersProps) {
  return (
    <div className="recommendations-filters">
      <label>
        Status
        <select
          value={filters.status ?? "open"}
          onChange={(event) =>
            onChange({
              ...filters,
              status: event.target.value as RecommendationStatus | "all",
            })
          }
        >
          <option value="open">Open</option>
          <option value="accepted">Accepted</option>
          <option value="dismissed">Dismissed</option>
          <option value="converted_to_workstream">Converted</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </label>
      <label>
        Priority
        <select
          value={filters.priority ?? "all"}
          onChange={(event) =>
            onChange({
              ...filters,
              priority: event.target.value as RecommendationPriority | "all",
            })
          }
        >
          <option value="all">All</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </label>
      <label>
        Source
        <select
          value={filters.source ?? "all"}
          onChange={(event) =>
            onChange({
              ...filters,
              source: event.target.value as RecommendationSource | "all",
            })
          }
        >
          <option value="all">All</option>
          <option value="insight">Insight</option>
          <option value="impact_analysis">Impact</option>
          <option value="lesson">Lesson</option>
          <option value="known_failure">Known failure</option>
          <option value="source_health">Source health</option>
          <option value="stripe">Stripe</option>
          <option value="github">GitHub</option>
          <option value="posthog">PostHog</option>
          <option value="manual">Manual</option>
        </select>
      </label>
    </div>
  );
}
