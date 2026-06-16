"use client";

import {
  AbstractDiagram,
  DiagramNode,
  DotLine,
} from "@/components/landing/abstract-diagram";
import { useDiagramCycle } from "@/components/landing/why-sortiri/use-diagram-cycle";

const LOOP = [
  { id: "source", label: "private workstream" },
  { id: "suite", label: "eval suite" },
  { id: "runs", label: "model runs" },
  { id: "result", label: "pass / fail" },
  { id: "routing", label: "routing rec" },
] as const;

const CYCLE_MS = 1100;

type PrivateEvalsDiagramProps = {
  className?: string;
};

export function PrivateEvalsDiagram({ className = "" }: PrivateEvalsDiagramProps) {
  const { cycle, staticMode } = useDiagramCycle(CYCLE_MS);
  const activeIndex = staticMode ? 2 : cycle % LOOP.length;

  return (
    <AbstractDiagram
      className={`uc-evals-diagram${staticMode ? " uc-evals-diagram--static" : ""} ${className}`.trim()}
      ariaLabel="Eval loop from private workstream through eval suite, model runs, pass or fail, and routing recommendation."
    >
      <ul className="uc-evals-diagram__loop">
        {LOOP.map((step, index) => (
          <li key={step.id} className="uc-evals-diagram__step">
            <DiagramNode
              accent={index === activeIndex}
              className={
                index === activeIndex && step.id === "result"
                  ? "uc-evals-diagram__node--result"
                  : undefined
              }
            >
              {step.label}
            </DiagramNode>
            {index < LOOP.length - 1 ? (
              <span className="uc-evals-diagram__connector" aria-hidden>
                <DotLine dense className="uc-evals-diagram__dots" />
                <span className="uc-evals-diagram__arrow">→</span>
              </span>
            ) : (
              <span className="uc-evals-diagram__return" aria-hidden>
                ↺ context
              </span>
            )}
          </li>
        ))}
      </ul>
    </AbstractDiagram>
  );
}
