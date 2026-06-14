"use client";

import Link from "next/link";
import { ArtifactPreview } from "@/components/artifacts/artifact-preview";
import { formatEventTime } from "@/lib/events/format";
import {
  getActorLabel,
  getCategoryLabel,
  getSourceLabel,
} from "@/lib/events/labels";
import type { TimelineEvent } from "@/types/events";
import "./home.css";

type RecentHistorySectionProps = {
  events: TimelineEvent[];
};

export function RecentHistorySection({ events }: RecentHistorySectionProps) {
  return (
    <section className="home-section">
      <div className="home-section__header">
        <h2 className="home-section__title">Recent History</h2>
        <Link href="/timeline" className="home-section__link">
          View Timeline
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="home-section__empty">No events recorded yet.</p>
      ) : (
        events.map((event) => (
          <article key={event.id} className="home-event-row">
            <div className="home-event-row__top">
              <p className="home-event-row__category">{getCategoryLabel(event.category)}</p>
            </div>
            <h3 className="home-event-row__title">{event.title}</h3>
            <p className="home-event-row__meta">
              {getActorLabel(event.actor)} · {getSourceLabel(event.source)} ·{" "}
              {formatEventTime(event.occurredAt)}
            </p>
            {event.artifactIds && event.artifactIds.length > 0 ? (
              <ArtifactPreview artifactIds={event.artifactIds} compact />
            ) : null}
            {event.workstreamId ? (
              <Link
                href={`/workstreams/${event.workstreamId}`}
                className="home-event-row__link"
              >
                View Replay
              </Link>
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}
