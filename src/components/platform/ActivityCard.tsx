import Link from "next/link";
import type { ReactNode } from "react";

type ActivityCardProps = {
  marker: string;
  title: string;
  titleHref?: string;
  summary?: string;
  metaLine?: string;
  timeLabel: string;
  aside?: ReactNode;
};

export function ActivityCard({
  marker,
  title,
  titleHref,
  summary,
  metaLine,
  timeLabel,
  aside,
}: ActivityCardProps) {
  return (
    <article className="activity-card">
      <div className="activity-card__marker" aria-hidden="true">
        {marker.slice(0, 2)}
      </div>
      <div className="activity-card__content">
        <h3 className="activity-card__title">
          {titleHref ? <Link href={titleHref}>{title}</Link> : title}
        </h3>
        {summary ? <p className="activity-card__summary">{summary}</p> : null}
        {metaLine ? <p className="activity-card__meta-line">{metaLine}</p> : null}
      </div>
      <div className="activity-card__aside">
        <time>{timeLabel}</time>
        {aside}
      </div>
    </article>
  );
}
