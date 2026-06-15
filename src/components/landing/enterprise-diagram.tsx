"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { departureMono } from "@/lib/landing-fonts";

const MONO = departureMono.className;
const CYCLE_MS = 1600;

const COLUMN_X = [50, 150, 250, 350] as const;
const CORE_X = 200;
const TEAM_LINE_Y = 52;
const CORE_TOP_Y = 88;
const CORE_BOTTOM_Y = 148;
const SIGNAL_LINE_Y = 192;

const TEAMS = [
  { id: "eng", label: "eng", blocks: 3, column: 0 },
  { id: "product", label: "product", blocks: 2, column: 1 },
  { id: "growth", label: "growth", blocks: 2, column: 2 },
  { id: "support", label: "support", blocks: 2, column: 3 },
] as const;

const SIGNALS = [
  { id: "spend", label: "spend", column: 0 },
  { id: "duplicates", label: "duplicates", column: 1 },
  { id: "impact", label: "impact", column: 2 },
  { id: "risk", label: "risk", column: 3 },
] as const;

function teamPath(column: number) {
  const x = COLUMN_X[column];
  const bendY = CORE_TOP_Y - 16;
  return `M ${x} ${TEAM_LINE_Y} L ${x} ${bendY} L ${CORE_X} ${CORE_TOP_Y}`;
}

function signalPath(column: number) {
  const x = COLUMN_X[column];
  const bendY = CORE_BOTTOM_Y + 20;
  return `M ${CORE_X} ${CORE_BOTTOM_Y} L ${CORE_X} ${bendY} L ${x} ${SIGNAL_LINE_Y}`;
}

const CORE_SPINE = `M ${CORE_X} ${CORE_TOP_Y} L ${CORE_X} ${CORE_BOTTOM_Y}`;

type EnterpriseDiagramProps = {
  className?: string;
};

export function EnterpriseDiagram({ className = "" }: EnterpriseDiagramProps) {
  const reduceMotion = useReducedMotion();
  const staticMode = reduceMotion === true;
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (staticMode) return;

    const id = window.setInterval(() => {
      setCycle((value) => value + 1);
    }, CYCLE_MS);

    return () => window.clearInterval(id);
  }, [staticMode]);

  const activeTeamIndex = staticMode ? 1 : cycle % TEAMS.length;
  const activeSignalIndex = staticMode ? 2 : cycle % SIGNALS.length;
  const activeBlockIndex = staticMode ? 0 : cycle % 3;

  const flowPaths = useMemo(
    () => [
      ...TEAMS.map((team) => teamPath(team.column)),
      CORE_SPINE,
      ...SIGNALS.map((signal) => signalPath(signal.column)),
    ],
    [],
  );

  return (
    <div
      className={`enterprise-diagram${staticMode ? " enterprise-diagram--static" : ""} ${className}`.trim()}
      role="img"
      aria-label="Organization agent map with team blocks flowing into Sortiri black box and control signals."
    >
      <div className="enterprise-diagram__canvas">
        <svg
          className="enterprise-diagram__connectors"
          viewBox="0 0 400 232"
          preserveAspectRatio="none"
          aria-hidden
        >
          {flowPaths.map((path, index) => (
            <path
              key={path}
              d={path}
              className={`enterprise-diagram__path${
                index === activeTeamIndex ||
                index === TEAMS.length ||
                index === TEAMS.length + 1 + activeSignalIndex
                  ? " enterprise-diagram__path--active"
                  : ""
              }`}
            />
          ))}

          {!staticMode
            ? flowPaths.map((path, index) => (
                <circle key={`packet-${path}`} r="2.25" className="enterprise-diagram__packet">
                  <animateMotion
                    dur={`${1.35 + (index % 4) * 0.15}s`}
                    repeatCount="indefinite"
                    begin={`${index * 0.12}s`}
                    path={path}
                  />
                </circle>
              ))
            : null}
        </svg>

        {TEAMS.map((team, index) => {
          const isActive = index === activeTeamIndex;
          return (
            <div
              key={team.id}
              className={`enterprise-diagram__team enterprise-diagram__team--col-${team.column + 1}${
                isActive ? " enterprise-diagram__team--lit" : ""
              }`}
            >
              <span className={`${MONO} enterprise-diagram__team-label`}>
                {team.label}
              </span>
              <div className="enterprise-diagram__blocks">
                {Array.from({ length: team.blocks }, (_, blockIndex) => (
                  <span
                    key={blockIndex}
                    className={`enterprise-diagram__block${
                      isActive && blockIndex === activeBlockIndex
                        ? " enterprise-diagram__block--lit"
                        : ""
                    }`}
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="enterprise-diagram__core">
          <span className={`${MONO} enterprise-diagram__core-line`}>SORTIRI</span>
          <span className={`${MONO} enterprise-diagram__core-line`}>BLACK BOX</span>
        </div>

        {SIGNALS.map((signal, index) => {
          const isActive = index === activeSignalIndex;
          return (
            <span
              key={signal.id}
              className={`${MONO} enterprise-diagram__signal enterprise-diagram__signal--col-${
                signal.column + 1
              }${isActive ? " enterprise-diagram__signal--lit" : ""}`}
            >
              {signal.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
