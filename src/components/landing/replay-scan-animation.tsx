"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { departureMono } from "@/lib/landing-fonts";

const MONO = departureMono.className;
const ACCENT = "replay-scan__accent";

const QUESTION = "what changed in onboarding?";

const EVENTS = [
  { time: "09:12", type: "decision", detail: "change CTA" },
  { time: "09:44", type: "agent", detail: "edited flow" },
  { time: "10:03", type: "github", detail: "PR #42 merged" },
  { time: "10:18", type: "posthog", detail: "users activated" },
  { time: "10:31", type: "stripe", detail: "checkout intent" },
] as const;

const PACKET_LINES = [
  "3 linked events",
  "1 decision found",
  "evidence attached",
  "replay ready",
] as const;

const CYCLE_MS = 1500;
const SCAN_PHASES = EVENTS.length + PACKET_LINES.length + 1;

type ScanPanelProps = {
  title: string;
  titleId: string;
  children: ReactNode;
  className?: string;
};

function ScanPanel({ title, titleId, children, className = "" }: ScanPanelProps) {
  return (
    <section
      className={`replay-scan__panel ${className}`.trim()}
      aria-labelledby={titleId}
    >
      <header className="replay-scan__panel-header">
        <h3 id={titleId} className={`${MONO} replay-scan__panel-title`}>
          {title}
        </h3>
      </header>
      <div className="replay-scan__panel-body">{children}</div>
    </section>
  );
}

type ReplayScanAnimationProps = {
  className?: string;
};

export function ReplayScanAnimation({ className = "" }: ReplayScanAnimationProps) {
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

  const phase = staticMode ? SCAN_PHASES : cycle % SCAN_PHASES;

  const litEvents = staticMode
    ? EVENTS.length
    : Math.min(Math.max(phase, 0), EVENTS.length);
  const visibleLines = staticMode
    ? PACKET_LINES.length
    : Math.max(0, Math.min(phase - EVENTS.length, PACKET_LINES.length));
  const replayComplete = staticMode || phase >= SCAN_PHASES - 1;

  const scanProgress = useMemo(() => {
    if (staticMode) return 100;
    if (litEvents === 0) return 8;
    return Math.min(12 + (litEvents / EVENTS.length) * 78, 92);
  }, [litEvents, staticMode]);

  return (
    <div
      className={`replay-scan${staticMode ? " replay-scan--static" : ""} ${className}`.trim()}
      role="img"
      aria-label="Vertical forensic scan: question drops into company timeline, events match, replay packet assembles."
    >
      <div className="replay-scan__stack">
        <ScanPanel title="Question" titleId="replay-scan-question" className="replay-scan__question">
          <p className={`${MONO} replay-scan__prompt`}>
            <span className="replay-scan__caret" aria-hidden>
              &gt;
            </span>{" "}
            {QUESTION}
            <span className={`replay-scan__cursor blink ${ACCENT}`} aria-hidden>
              _
            </span>
          </p>
        </ScanPanel>

        <div className="replay-scan__connector" aria-hidden>
          <span className="replay-scan__connector-line">│</span>
          {!staticMode ? (
            <svg
              className="replay-scan__drop-svg"
              viewBox="0 0 10 48"
              preserveAspectRatio="none"
            >
              <circle r="2.5" className="replay-scan__packet-dot" cx="5" cy="0">
                <animateMotion
                  dur="1.2s"
                  repeatCount="indefinite"
                  path="M 5 0 L 5 48"
                />
              </circle>
            </svg>
          ) : null}
          <span className="replay-scan__connector-arrow">▼</span>
        </div>

        <ScanPanel
          title="Company Timeline Scan"
          titleId="replay-scan-timeline"
          className="replay-scan__timeline"
        >
          <div className="replay-scan__timeline-body">
            {!staticMode ? (
              <span
                className="replay-scan__scanline"
                style={{ top: `${scanProgress}%` }}
                aria-hidden
              />
            ) : null}

            <ol className="replay-scan__events">
              {EVENTS.map((event, index) => {
                const isLit = index < litEvents;
                const emitParticle =
                  !staticMode && isLit && phase === index + 1;

                return (
                  <li
                    key={event.time}
                    className={`replay-scan__event${isLit ? " replay-scan__event--lit" : ""}${
                      emitParticle ? " replay-scan__event--emit" : ""
                    }`}
                  >
                    <div className={`${MONO} replay-scan__event-row`}>
                      <span className="replay-scan__event-time">[{event.time}]</span>
                      <span
                        className={`replay-scan__event-type${
                          isLit ? ` ${ACCENT}` : ""
                        }`}
                      >
                        {event.type}
                      </span>
                      <span className="replay-scan__event-detail">{event.detail}</span>
                    </div>
                    {index < EVENTS.length - 1 ? (
                      <span className="replay-scan__event-connector" aria-hidden>
                        │
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        </ScanPanel>

        <div className="replay-scan__connector" aria-hidden>
          <span className="replay-scan__connector-line">│</span>
          {!staticMode && litEvents === EVENTS.length && visibleLines > 0 ? (
            <svg
              className="replay-scan__particle-svg"
              viewBox="0 0 10 40"
              preserveAspectRatio="none"
            >
              <circle r="1.75" className="replay-scan__packet-dot" cx="5" cy="0">
                <animateMotion
                  dur="0.9s"
                  repeatCount="indefinite"
                  path="M 5 0 L 5 40"
                />
              </circle>
            </svg>
          ) : null}
          <span className="replay-scan__connector-arrow">▼</span>
        </div>

        <ScanPanel
          title="Replay Packet"
          titleId="replay-scan-packet"
          className={`replay-scan__packet${
            replayComplete ? " replay-scan__packet--ready" : ""
          }`}
        >
          <ul className={`${MONO} replay-scan__packet-lines`}>
            {PACKET_LINES.map((line, index) => (
              <li
                key={line}
                className={`replay-scan__packet-line${
                  index < visibleLines ? " replay-scan__packet-line--visible" : ""
                }${line === "replay ready" && replayComplete ? ` ${ACCENT}` : ""}`}
              >
                {line}
              </li>
            ))}
          </ul>
        </ScanPanel>
      </div>

      <p className="replay-scan__sr-only">
        Question scans company timeline through decision, agent, github, posthog, and
        stripe events, then assembles a replay packet with linked events and evidence.
      </p>
    </div>
  );
}
