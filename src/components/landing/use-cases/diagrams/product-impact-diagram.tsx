"use client";

import {
  AbstractDiagram,
  DiagramNode,
  Packet,
} from "@/components/landing/abstract-diagram";
import { useDiagramCycle } from "@/components/landing/why-sortiri/use-diagram-cycle";

const BEFORE = ["baseline", "signup rate", "agent runs", "open PRs"] as const;
const AFTER = ["activation", "revenue", "merged", "impact +12%"] as const;
const CYCLE_MS = 1300;

type ProductImpactDiagramProps = {
  className?: string;
};

export function ProductImpactDiagram({
  className = "",
}: ProductImpactDiagramProps) {
  const { cycle, staticMode } = useDiagramCycle(CYCLE_MS);
  const activeBefore = staticMode ? 1 : cycle % BEFORE.length;
  const activeAfter = staticMode ? 2 : cycle % AFTER.length;

  return (
    <AbstractDiagram
      className={`uc-impact-diagram${staticMode ? " uc-impact-diagram--static" : ""} ${className}`.trim()}
      ariaLabel="Before and after product impact split with a workstream at center and baseline versus movement signals."
    >
      <div className="uc-impact-diagram__grid">
        <div className="uc-impact-diagram__column">
          <Packet className="uc-impact-diagram__column-label">before</Packet>
          {BEFORE.map((signal, index) => (
            <DiagramNode key={signal} accent={index === activeBefore}>
              {signal}
            </DiagramNode>
          ))}
        </div>

        <div className="uc-impact-diagram__center">
          <span className="uc-impact-diagram__line uc-impact-diagram__line--left" aria-hidden />
          <DiagramNode accent className="uc-impact-diagram__workstream">
            workstream
          </DiagramNode>
          <span className="uc-impact-diagram__line uc-impact-diagram__line--right" aria-hidden />
        </div>

        <div className="uc-impact-diagram__column">
          <Packet className="uc-impact-diagram__column-label">after</Packet>
          {AFTER.map((signal, index) => (
            <DiagramNode key={signal} accent={index === activeAfter}>
              {signal}
            </DiagramNode>
          ))}
        </div>
      </div>
    </AbstractDiagram>
  );
}
