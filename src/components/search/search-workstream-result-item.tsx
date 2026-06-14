"use client";

import { WorkstreamStatusBadge } from "@/components/workstreams/workstream-status-badge";
import { SearchHighlight } from "@/lib/search/highlight";
import {
  formatWorkstreamTime,
  getCreatedByLabel,
} from "@/lib/workstreams/format";
import { getStatusLabel } from "@/lib/workstreams/labels";
import type { Workstream } from "@/types/events";
import "./search.css";

type SearchWorkstreamResultItemProps = {
  workstream: Workstream;
  query?: string;
  onClick?: () => void;
};

export function SearchWorkstreamResultItem({
  workstream,
  query = "",
  onClick,
}: SearchWorkstreamResultItemProps) {
  const createdBy = getCreatedByLabel(workstream.createdBy);
  const started = formatWorkstreamTime(workstream.startedAt);

  const content = (
    <>
      <div className="search-result-item__top">
        <h3 className="search-result-item__title">
          <SearchHighlight text={workstream.title} query={query} />
        </h3>
        <WorkstreamStatusBadge status={workstream.status} />
      </div>
      {workstream.summary ? (
        <p className="search-result-item__summary">
          <SearchHighlight text={workstream.summary} query={query} />
        </p>
      ) : null}
      <p className="search-result-item__meta">
        {getStatusLabel(workstream.status)} · {createdBy} · started {started}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="search-result-item search-result-item--workstream" onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <article className="search-result-item search-result-item--workstream search-result-item--static">
      {content}
    </article>
  );
}
