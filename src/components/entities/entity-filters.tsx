"use client";

import type { EntityType } from "@/types/events";
import { ENTITY_FILTER_OPTIONS } from "@/lib/entities/format";

type EntityFiltersProps = {
  value: EntityType | null;
  onChange: (value: EntityType | null) => void;
};

export function EntityFilters({ value, onChange }: EntityFiltersProps) {
  return (
    <div className="entity-filters" role="tablist" aria-label="Filter entities by type">
      {ENTITY_FILTER_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.label}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`entity-filter${isActive ? " is-active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
