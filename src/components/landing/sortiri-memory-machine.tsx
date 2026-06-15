"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { departureMono } from "@/lib/landing-fonts";

const MONO = departureMono.className;

const SOURCES = ["Cursor", "GitHub", "PostHog", "Stripe", "Slack"] as const;

const OUTPUTS = [
  { id: "replay", label: "Replay", status: "Replay ready" },
  { id: "impact", label: "Impact", status: "Impact calculated" },
  { id: "context", label: "Context", status: "Context packed" },
  { id: "audits", label: "Audits", status: "Audit sealed" },
  { id: "evals", label: "Evals", status: "Eval passed" },
] as const;

const TIMELINE_EVENTS = [
  "[10:42] agent.action",
  "[10:51] github.pr",
  "[11:08] product.event",
  "[11:32] revenue.event",
  "[11:45] decision",
] as const;

const CYCLE_MS = 1600;

type SortiriMemoryMachineProps = {
  className?: string;
};

export function SortiriMemoryMachine({ className = "" }: SortiriMemoryMachineProps) {
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

  const activeEventIndex = cycle % TIMELINE_EVENTS.length;
  const activeOutputIndex = cycle % OUTPUTS.length;
  const activeSourceIndex = cycle % SOURCES.length;

  const connectorPaths = useMemo(
    () =>
      [28, 68, 108, 148, 188].map(
        (y) => `M 2 ${y} L 398 ${y}`,
      ),
    [],
  );

  return (
    <div
      className={`memory-machine${staticMode ? " memory-machine--static" : ""} ${className}`.trim()}
      role="img"
      aria-label="Sortiri memory machine: sources emit events into the timeline core, producing replay, impact, context, audits, and evals."
    >
      <div className="memory-machine__layout">
        <p className={`${MONO} ascii-label memory-machine__column-label memory-machine__column-label--sources`}>
          sources
        </p>
        <p className={`${MONO} ascii-label memory-machine__column-label memory-machine__column-label--outputs`}>
          outputs
        </p>

        <div className="memory-machine__canvas">
          <svg
            className="memory-machine__connectors"
            viewBox="0 0 400 216"
            preserveAspectRatio="none"
            aria-hidden
          >
            {connectorPaths.map((path, index) => (
              <g key={path}>
                <path d={path} className="connector-line" />
                {!staticMode ? (
                  <>
                    <circle r="2.5" className="packet packet--in">
                      <animateMotion
                        dur={`${1.4 + index * 0.12}s`}
                        repeatCount="indefinite"
                        path={path}
                      />
                    </circle>
                    <circle r="2.5" className="packet packet--out">
                      <animateMotion
                        dur={`${1.5 + index * 0.1}s`}
                        repeatCount="indefinite"
                        begin={`${0.35 + index * 0.08}s`}
                        path={path}
                      />
                    </circle>
                  </>
                ) : null}
              </g>
            ))}
          </svg>

          <ul className="memory-machine__node-list memory-machine__sources">
            {SOURCES.map((source, index) => (
              <li key={source}>
                <span
                  className={`diagram-node memory-machine__node memory-machine__node--source${
                    !staticMode && index === activeSourceIndex
                      ? " memory-machine__node--lit"
                      : ""
                  }`}
                >
                  {source}
                </span>
              </li>
            ))}
          </ul>

          <div className="diagram-core memory-machine__core">
            <div className="memory-machine__core-header">
              <span className={`${MONO} ascii-label memory-machine__core-title`}>
                SORTIRI
              </span>
              <span className={`${MONO} ascii-label memory-machine__core-title`}>
                TIMELINE CORE
              </span>
            </div>

            <div className="memory-machine__core-body">
              <span
                className={`${MONO} memory-machine__cursor blink`}
                aria-hidden
              >
                _
              </span>

              <ul className="memory-machine__spine" aria-live="polite">
                {TIMELINE_EVENTS.map((event, index) => (
                  <li
                    key={event}
                    className={`memory-machine__spine-line${
                      index === activeEventIndex ? " memory-machine__spine-line--active" : ""
                    }`}
                  >
                    <span className={MONO}>{event}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <ul className="memory-machine__node-list memory-machine__outputs">
            {OUTPUTS.map((output, index) => {
              const isActive = index === activeOutputIndex;
              return (
                <li key={output.id}>
                  <span
                    className={`diagram-node memory-machine__node memory-machine__node--output${
                      !staticMode && isActive ? " memory-machine__node--lit" : ""
                    }`}
                  >
                    {output.label}
                  </span>
                  <span
                    className={`${MONO} memory-machine__output-status${
                      isActive ? " memory-machine__output-status--active" : ""
                    }`}
                  >
                    {output.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="memory-machine__sr-only">
        Sortiri ingests events from Cursor, GitHub, PostHog, Stripe, and Slack into a
        timeline core, then produces replay, impact, context, audits, and evals.
      </p>
    </div>
  );
}
