"use client";

export type TimelineDensity = "comfortable" | "compact";

export const TIMELINE_DENSITY_STORAGE_KEY = "sortiri-timeline-density";

type TimelineDensityToggleProps = {
  value: TimelineDensity;
  onChange: (value: TimelineDensity) => void;
};

export function TimelineDensityToggle({ value, onChange }: TimelineDensityToggleProps) {
  return (
    <div className="timeline-density-toggle" role="group" aria-label="Timeline density">
      <button
        type="button"
        className={value === "comfortable" ? "is-active" : ""}
        onClick={() => onChange("comfortable")}
      >
        Comfortable
      </button>
      <button
        type="button"
        className={value === "compact" ? "is-active" : ""}
        onClick={() => onChange("compact")}
      >
        Compact
      </button>
    </div>
  );
}
