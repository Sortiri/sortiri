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

const TEAMS = [
  { id: "eng", label: "eng", blocks: 3 },
  { id: "product", label: "product", blocks: 2 },
  { id: "growth", label: "growth", blocks: 2 },
  { id: "support", label: "support", blocks: 2 },
] as const;

const SIGNALS = ["team", "project", "spend", "failures", "impact"] as const;
const CYCLE_MS = 1400;

type AgentFleetDiagramProps = {
  className?: string;
};

export function AgentFleetDiagram({ className = "" }: AgentFleetDiagramProps) {
  const { cycle, staticMode } = useDiagramCycle(CYCLE_MS);
  const activeTeam = staticMode ? 1 : cycle % TEAMS.length;
  const activeSignal = staticMode ? 2 : cycle % SIGNALS.length;

  return (
    <AbstractDiagram
      className={`abstract-diagram--org uc-fleet-diagram${
        staticMode ? " uc-fleet-diagram--static" : ""
      } ${className}`.trim()}
      ariaLabel="Org map with teams feeding agent packets into Sortiri and surfacing team, project, spend, failures, and impact signals."
    >
      <div className="abstract-org__teams">
        {TEAMS.map((team, index) => (
          <DiagramCluster key={team.id} label={team.label}>
            {Array.from({ length: team.blocks }, (_, blockIndex) => (
              <MiniBlock
                key={blockIndex}
                accent={
                  !staticMode &&
                  index === activeTeam &&
                  blockIndex === cycle % team.blocks
                }
              />
            ))}
          </DiagramCluster>
        ))}
      </div>

      <div className="abstract-org__converge" aria-hidden>
        {TEAMS.map((team) => (
          <span key={team.id} className="abstract-org__converge-line" />
        ))}
      </div>

      <DotLine className="abstract-org__dot-bar" />

      <DiagramCore
        lines={["sortiri", "black box"]}
        className="abstract-org__core uc-fleet-diagram__core"
      />

      <DotLine className="abstract-org__dot-bar" />

      <div className="abstract-org__signals">
        {SIGNALS.map((signal, index) => (
          <DiagramNode key={signal} accent={index === activeSignal}>
            {signal}
          </DiagramNode>
        ))}
      </div>
    </AbstractDiagram>
  );
}
