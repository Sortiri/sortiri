"use client";

import Link from "next/link";
import { ActivityCard, ActivityFeed } from "@/components/platform";
import { formatEventTime, groupEventsByDay } from "@/lib/events/format";
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
  const dayGroups = groupEventsByDay(events);

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
        <ActivityFeed
          groups={dayGroups.map((group) => ({
            label: group.label,
            items: group.events.map((event) => (
              <ActivityCard
                key={event.id}
                marker={getCategoryLabel(event.category)}
                title={event.title}
                metaLine={`${getActorLabel(event.actor)} · ${getSourceLabel(event.source)}`}
                timeLabel={formatEventTime(event.occurredAt)}
                aside={
                  event.workstreamId ? (
                    <Link href={`/workstreams/${event.workstreamId}`}>Replay</Link>
                  ) : undefined
                }
              />
            )),
          }))}
        />
      )}
    </section>
  );
}
