"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { departureMono } from "@/lib/landing-fonts";

const MONO = departureMono.className;
const CYCLE_MS = 1400;

type DecisionTimelineEvent = {
  time: string;
  type: string;
  typeHighlight?: boolean;
  description: string;
  descriptionHighlight?: boolean;
};

const EVENTS: DecisionTimelineEvent[] = [
  {
    time: "[09:12]",
    type: "signal",
    typeHighlight: true,
    description: "users dropping during onboarding",
  },
  {
    time: "[09:28]",
    type: "decision",
    typeHighlight: true,
    description: "simplify signup flow",
  },
  {
    time: "[09:44]",
    type: "agent",
    typeHighlight: true,
    description: "edited onboarding + pricing copy",
  },
  {
    time: "[10:03]",
    type: "github",
    description: "PR #42 merged",
  },
  {
    time: "[10:18]",
    type: "posthog",
    description: "activation events increased",
    descriptionHighlight: true,
  },
  {
    time: "[10:31]",
    type: "stripe",
    description: "checkout intent, no payment yet",
  },
  {
    time: "[11:00]",
    type: "lesson",
    typeHighlight: true,
    description: "signup moved before revenue did",
  },
];

type DecisionTimelineDiagramProps = {
  className?: string;
};

export function DecisionTimelineDiagram({
  className = "",
}: DecisionTimelineDiagramProps) {
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

  const activeIndex = staticMode ? 4 : cycle % EVENTS.length;

  return (
    <div
      className={`decision-timeline${staticMode ? " decision-timeline--static" : ""} ${className}`.trim()}
      role="img"
      aria-label="Chronological decision timeline from onboarding signal through agent changes, GitHub merge, product events, and extracted lesson."
    >
      <article
        className="timeline-diagram__card decision-timeline__card"
        aria-labelledby="decision-timeline-title"
      >
        <header className="timeline-diagram__card-header">
          <h3
            id="decision-timeline-title"
            className={`${MONO} timeline-diagram__card-title`}
          >
            Decision Timeline
          </h3>
        </header>

        <div className={`${MONO} decision-timeline__body`}>
          <ul className="decision-timeline__list" aria-live="polite">
            {EVENTS.map((event, index) => {
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;

              return (
                <li
                  key={`${event.time}-${event.type}`}
                  className={`decision-timeline__entry${
                    isActive ? " decision-timeline__entry--active" : ""
                  }${isPast ? " decision-timeline__entry--past" : ""}`}
                >
                  <div className="decision-timeline__row">
                    <span className="decision-timeline__time">{event.time}</span>
                    <span
                      className={`decision-timeline__type${
                        event.typeHighlight || isActive
                          ? " decision-timeline__type--accent"
                          : ""
                      }`}
                    >
                      {event.type}
                    </span>
                    <span
                      className={`decision-timeline__description${
                        event.descriptionHighlight || isActive
                          ? " decision-timeline__description--accent"
                          : ""
                      }`}
                    >
                      {event.description}
                    </span>
                  </div>

                  {index < EVENTS.length - 1 ? (
                    <div
                      className={`decision-timeline__connector${
                        isActive ? " decision-timeline__connector--flow" : ""
                      }`}
                      aria-hidden
                    >
                      │
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <span className={`${MONO} decision-timeline__cursor blink`} aria-hidden>
            _
          </span>
        </div>
      </article>
    </div>
  );
}
