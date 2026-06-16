"use client";

import {
  AbstractDiagram,
  DiagramNode,
  DotLine,
} from "@/components/landing/abstract-diagram";
import { useDiagramCycle } from "@/components/landing/why-sortiri/use-diagram-cycle";

const STEPS = [
  "decision",
  "diff",
  "deploy",
  "error",
  "rollback",
  "lesson",
] as const;

const CYCLE_MS = 1200;

type IncidentReplayDiagramProps = {
  className?: string;
};

export function IncidentReplayDiagram({
  className = "",
}: IncidentReplayDiagramProps) {
  const { cycle, staticMode } = useDiagramCycle(CYCLE_MS);
  const activeIndex = staticMode ? 3 : cycle % STEPS.length;

  return (
    <AbstractDiagram
      className={`abstract-diagram--trace uc-incident-diagram${
        staticMode ? " uc-incident-diagram--static" : ""
      } ${className}`.trim()}
      ariaLabel="Forensic incident timeline from decision through diff, deploy, error, rollback, and lesson."
    >
      <div className="abstract-trace__path">
        {STEPS.map((step, index) => (
          <div key={step} className="abstract-trace__step">
            <DiagramNode accent={index === activeIndex}>{step}</DiagramNode>
            {index < STEPS.length - 1 ? (
              <>
                <DotLine
                  orientation="vertical"
                  dense
                  className="abstract-trace__step-dots"
                />
                <span className="abstract-trace__stem" aria-hidden>
                  │
                </span>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </AbstractDiagram>
  );
}
