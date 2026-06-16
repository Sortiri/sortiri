import type { HighlightCard } from "@/components/landing/highlights/highlights";
import { HighlightLabelsVisual } from "@/components/landing/highlights/visuals/highlight-labels-visual";
import { inter } from "@/lib/inter";
import { departureMono } from "@/lib/landing-fonts";

const BODY = inter.className;
const EYEBROW = departureMono.className;

type HighlightCardProps = {
  card: HighlightCard;
};

export function HighlightCardItem({ card }: HighlightCardProps) {
  return (
    <article className="highlights__card">
      <div className="highlights__card-copy">
        <p className={`${EYEBROW} highlights__eyebrow`}>{card.eyebrow}</p>
        <h3 className={`${BODY} highlights__title`}>{card.title}</h3>
        <p className={`${BODY} highlights__body`}>{card.body}</p>
      </div>
      <div className="highlights__card-visual">
        <HighlightLabelsVisual
          labels={card.labels}
          ariaLabel={card.visualAriaLabel}
        />
      </div>
    </article>
  );
}
