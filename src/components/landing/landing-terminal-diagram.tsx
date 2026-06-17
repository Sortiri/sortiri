import { Fragment } from "react";
import { departureMono } from "@/lib/landing-fonts";

const ACCENT = "text-[#c490e8]";
const MONO = departureMono.className;

export type TerminalDiagramRowPart = {
  text: string;
  highlight?: boolean;
};

export type TerminalDiagramRow =
  | string
  | { text: string; highlight?: boolean }
  | { parts: TerminalDiagramRowPart[] };

export type TerminalDiagramCard = {
  id: string;
  title: string;
  rows: TerminalDiagramRow[];
};

type LandingTerminalDiagramProps = {
  cards: TerminalDiagramCard[];
  ariaLabel: string;
  idPrefix: string;
  className?: string;
};

function renderDiagramRow(row: TerminalDiagramRow) {
  if (typeof row === "string") {
    return row;
  }

  if ("parts" in row) {
    return row.parts.map((part, index) =>
      part.highlight ? (
        <span key={index} className={ACCENT}>
          {part.text}
        </span>
      ) : (
        <Fragment key={index}>{part.text}</Fragment>
      ),
    );
  }

  return row.highlight ? (
    <span className={ACCENT}>{row.text}</span>
  ) : (
    row.text
  );
}

function DiagramCard({
  card,
  idPrefix,
}: {
  card: TerminalDiagramCard;
  idPrefix: string;
}) {
  const titleId = `${idPrefix}-${card.id}-title`;

  return (
    <article
      className="timeline-diagram__card min-w-0 flex-1"
      aria-labelledby={titleId}
    >
      <header className="timeline-diagram__card-header">
        <h3 id={titleId} className={`${MONO} timeline-diagram__card-title`}>
          {card.title}
        </h3>
      </header>
      <pre className={`${MONO} timeline-diagram__card-body`} tabIndex={-1}>
        {card.rows.map((row, index) => (
          <Fragment key={`${card.id}-${index}`}>
            {index > 0 ? "\n" : null}
            {renderDiagramRow(row)}
          </Fragment>
        ))}
      </pre>
    </article>
  );
}

function DiagramArrow({ direction }: { direction: "horizontal" | "vertical" }) {
  if (direction === "horizontal") {
    return (
      <div
        className={`${MONO} timeline-diagram__arrow timeline-diagram__arrow--horizontal hidden shrink-0 lg:flex`}
        aria-hidden
      >
        <span className="timeline-diagram__arrow-line">────</span>
        <span className="timeline-diagram__arrow-head">▶</span>
      </div>
    );
  }

  return (
    <div
      className={`${MONO} timeline-diagram__arrow timeline-diagram__arrow--vertical flex shrink-0 lg:hidden`}
      aria-hidden
    >
      <span>│</span>
      <span>▼</span>
    </div>
  );
}

export function LandingTerminalDiagram({
  cards,
  ariaLabel,
  idPrefix,
  className = "",
}: LandingTerminalDiagramProps) {
  return (
    <div
      className={`timeline-diagram ${className}`.trim()}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="timeline-diagram__flow">
        {cards.map((card, index) => (
          <div key={card.id} className="timeline-diagram__segment">
            <DiagramCard card={card} idPrefix={idPrefix} />
            {index < cards.length - 1 ? (
              <>
                <DiagramArrow direction="horizontal" />
                <DiagramArrow direction="vertical" />
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
