"use client";

import {
  AbstractDiagram,
  DiagramCluster,
  DiagramCore,
  DiagramNode,
  DotLine,
  MiniBlock,
} from "@/components/landing/abstract-diagram";
import { useDiagramCycle } from "@/components/landing/why-sortiri/use-diagram-cycle";

const TEAMS = ["eng", "product", "growth", "support"] as const;
const INPUTS = ["spend", "retry", "duplicate work"] as const;
const OUTPUTS = ["savings", "risk flags"] as const;
const CYCLE_MS = 1400;

type SpendControlDiagramProps = {
  className?: string;
};

export function SpendControlDiagram({ className = "" }: SpendControlDiagramProps) {
  const { cycle, staticMode } = useDiagramCycle(CYCLE_MS);
  const activeTeam = staticMode ? 0 : cycle % TEAMS.length;
  const activeInput = staticMode ? 1 : cycle % INPUTS.length;
  const activeOutput = staticMode ? 0 : cycle % OUTPUTS.length;

  return (
    <AbstractDiagram
      className={`abstract-diagram--org uc-spend-diagram${
        staticMode ? " uc-spend-diagram--static" : ""
      } ${className}`.trim()}
      ariaLabel="Enterprise spend control field with teams and agents emitting spend, retry, and duplicate-work signals into Sortiri, then savings and risk flags."
    >
      <div className="abstract-org__teams uc-spend-diagram__teams">
        {TEAMS.map((team, index) => (
          <DiagramCluster key={team} label={team}>
            <MiniBlock accent={!staticMode && index === activeTeam} />
            <MiniBlock />
          </DiagramCluster>
        ))}
      </div>

      <div className="uc-spend-diagram__inputs">
        {INPUTS.map((input, index) => (
          <DiagramNode key={input} accent={index === activeInput}>
            {input}
          </DiagramNode>
        ))}
      </div>

      <DotLine className="abstract-org__dot-bar" />

      <DiagramCore lines={["sortiri", "control field"]} className="abstract-org__core" />

      <DotLine className="abstract-org__dot-bar" />

      <div className="abstract-org__signals">
        {OUTPUTS.map((output, index) => (
          <DiagramNode key={output} accent={index === activeOutput}>
            {output}
          </DiagramNode>
        ))}
      </div>
    </AbstractDiagram>
  );
}
