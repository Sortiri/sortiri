"use client";

import { DiagramNode } from "@/components/landing/abstract-diagram";
import { useDiagramCycle } from "@/components/landing/why-sortiri/use-diagram-cycle";

const CYCLE_MS = 1400;

type HighlightLabelsVisualProps = {
  labels: string[];
  ariaLabel: string;
};

export function HighlightLabelsVisual({
  labels,
  ariaLabel,
}: HighlightLabelsVisualProps) {
  const { cycle, staticMode } = useDiagramCycle(CYCLE_MS);
  const activeIndex = staticMode ? 0 : cycle % labels.length;

  return (
    <div className="hl-labels" role="img" aria-label={ariaLabel}>
      {labels.map((label, index) => (
        <DiagramNode key={label} accent={index === activeIndex}>
          {label}
        </DiagramNode>
      ))}
    </div>
  );
}
