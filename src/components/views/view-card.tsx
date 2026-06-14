"use client";

import Link from "next/link";
import type { SavedViewRecord } from "@/types/saved-views";
import { formatViewType, getViewHref } from "@/types/saved-views";
import "./views.css";

type ViewCardProps = {
  view: SavedViewRecord;
  eventCount?: number;
  lastEventAt?: number;
};

export function ViewCard({ view, eventCount, lastEventAt }: ViewCardProps) {
  return (
    <Link href={getViewHref(view.id)} className="view-card">
      <div className="view-card__top">
        <h2 className="view-card__name">{view.name}</h2>
        <div className="view-card__badges">
          <span className="view-card__badge">{formatViewType(view.type)}</span>
          <span className="view-card__badge">{view.visibility}</span>
          {view.isPinned ? <span className="view-card__badge">Pinned</span> : null}
        </div>
      </div>
      {view.description ? (
        <p className="view-card__description">{view.description}</p>
      ) : null}
      <p className="view-card__meta">
        {eventCount !== undefined
          ? `${eventCount} matching event${eventCount === 1 ? "" : "s"}`
          : "Open view"}
        {lastEventAt
          ? ` · Last match ${new Date(lastEventAt).toLocaleString()}`
          : ""}
      </p>
    </Link>
  );
}
