import { departureMono } from "@/lib/landing-fonts";

const ACCENT = "text-[#00E013]";
const MONO = departureMono.className;

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

function DecisionTimelineRow({ event }: { event: DecisionTimelineEvent }) {
  return (
    <div className="decision-timeline__row">
      <span className="decision-timeline__time">{event.time}</span>
      <span
        className={
          event.typeHighlight
            ? `decision-timeline__type ${ACCENT}`
            : "decision-timeline__type"
        }
      >
        {event.type}
      </span>
      <span
        className={
          event.descriptionHighlight
            ? `decision-timeline__description ${ACCENT}`
            : "decision-timeline__description"
        }
      >
        {event.description}
      </span>
    </div>
  );
}

export function DecisionTimelineDiagram({ className = "" }: { className?: string }) {
  return (
    <div
      className={`decision-timeline ${className}`.trim()}
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
          {EVENTS.map((event, index) => (
            <div key={`${event.time}-${event.type}`} className="decision-timeline__entry">
              <DecisionTimelineRow event={event} />
              {index < EVENTS.length - 1 ? (
                <div className="decision-timeline__connector" aria-hidden>
                  │
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
