"use client";

import Link from "next/link";
import { SearchHighlight } from "@/lib/search/highlight";
import { formatEventTime } from "@/lib/events/format";
import { getVisibilityLabel } from "@/lib/events/display";
import {
  getActorLabel,
  getCategoryLabel,
  getEventTypeLabel,
  getRevenueSummary,
  getSourceLabel,
} from "@/lib/events/labels";
import type { TimelineEvent } from "@/types/events";
import { getRelatedEventHref } from "@/lib/links/navigation";
import "./search.css";

type SearchResultItemProps = {
  event: TimelineEvent;
  query?: string;
  onClick?: () => void;
  relatedCount?: number;
};

export function SearchResultItem({
  event,
  query = "",
  onClick,
  relatedCount = 0,
}: SearchResultItemProps) {
  const actor = getActorLabel(event.actor);
  const source = getSourceLabel(event.source);
  const time = formatEventTime(event.occurredAt);
  const typeLabel = getEventTypeLabel(event.type);
  const visibilityLabel = getVisibilityLabel(event);
  const summary =
    event.category === "revenue_event"
      ? getRevenueSummary(
          event.data as Record<string, unknown> | undefined,
          event.summary,
        )
      : event.summary;

  const content = (
    <>
      <div className="search-result-item__labels">
        <p className="search-result-item__category">{getCategoryLabel(event.category)}</p>
        {typeLabel ? <p className="search-result-item__type">{typeLabel}</p> : null}
        {event.visibility === "debug" || visibilityLabel === "DEBUG" ? (
          <span className="search-result-item__badge search-result-item__badge--debug">
            DEBUG
          </span>
        ) : null}
      </div>
      <h3 className="search-result-item__title">
        <SearchHighlight text={event.title} query={query} />
      </h3>
      {summary ? (
        <p className="search-result-item__summary">
          <SearchHighlight text={summary} query={query} />
        </p>
      ) : null}
      <p className="search-result-item__meta">
        {actor} · {source} · {time}
      </p>
      {event.workstreamId ? (
        <p className="search-result-item__replay-link">View Replay</p>
      ) : null}
      {relatedCount > 0 ? (
        <p className="related-history__badge">
          {relatedCount} related event{relatedCount === 1 ? "" : "s"}
        </p>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="search-result-item" onClick={onClick}>
        {content}
      </button>
    );
  }

  if (event.workstreamId) {
    return (
      <Link href={getRelatedEventHref(event)} className="search-result-item">
        {content}
      </Link>
    );
  }

  return (
    <Link href={getRelatedEventHref(event)} className="search-result-item">
      {content}
    </Link>
  );
}
