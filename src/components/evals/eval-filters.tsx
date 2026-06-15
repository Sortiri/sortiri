"use client";

import type {
  EvalSuiteFilters,
  EvalSuiteSource,
  EvalSuiteStatus,
} from "@/types/evals";
import "./evals.css";

type EvalFiltersProps = {
  filters: EvalSuiteFilters;
  onChange: (filters: EvalSuiteFilters) => void;
};

export function EvalFilters({ filters, onChange }: EvalFiltersProps) {
  return (
    <div className="evals-filters">
      <label>
        Status
        <select
          value={filters.status ?? "active"}
          onChange={(event) =>
            onChange({
              ...filters,
              status: event.target.value as EvalSuiteStatus | "all",
            })
          }
        >
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </label>
      <label>
        Source
        <select
          value={filters.source ?? "all"}
          onChange={(event) =>
            onChange({
              ...filters,
              source: event.target.value as EvalSuiteSource | "all",
            })
          }
        >
          <option value="all">All</option>
          <option value="playbook">Playbook</option>
          <option value="lesson">Lesson</option>
          <option value="recommendation">Recommendation</option>
          <option value="context_pack">Context pack</option>
          <option value="known_failure">Known failure</option>
          <option value="manual">Manual</option>
          <option value="system">System</option>
        </select>
      </label>
    </div>
  );
}
