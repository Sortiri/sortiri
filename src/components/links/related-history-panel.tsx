"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatEventTime } from "@/lib/events/format";
import { getEventTypeLabel } from "@/lib/events/labels";
import { getConfidenceClassName, getConfidenceLabel } from "@/lib/links/confidence";
import { getRelatedEventHref } from "@/lib/links/navigation";
import type { RelatedHistoryItem } from "@/types/event-links";
import "./related-history.css";

type RelatedHistoryPanelProps = {
  eventId: string;
  relatedCount?: number;
};

function RelatedHistoryItemRow({ item }: { item: RelatedHistoryItem }) {
  const related = item.relatedEvent;
  if (!related) return null;

  const typeLabel = getEventTypeLabel(related.type);
  const time = formatEventTime(related.occurredAt);
  const confidenceLabel = getConfidenceLabel(item.link.confidence);

  return (
    <li className="related-history__item">
      <Link
        href={getRelatedEventHref(related)}
        className="related-history__item-title"
      >
        {related.title}
      </Link>
      <p className="related-history__item-meta">
        {typeLabel ?? related.type} · {time}{" "}
        <span className={getConfidenceClassName(item.link.confidence)}>
          {confidenceLabel}
        </span>
      </p>
      <p className="related-history__reason">{item.link.reason}</p>
    </li>
  );
}

export function RelatedHistoryPanel({ eventId, relatedCount }: RelatedHistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const countLabel = relatedCount ?? 0;

  const items = useQuery(
    api.eventLinks.listForEvent,
    open ? { eventId: eventId as Id<"events">, limit: 20 } : "skip",
  );

  if (countLabel === 0 && !open) return null;

  const before = (items ?? []).filter((item) => item.direction === "before");
  const after = (items ?? []).filter((item) => item.direction === "after");

  return (
    <div className="related-history">
      <button
        type="button"
        className="related-history__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        Related history{countLabel > 0 ? ` (${countLabel})` : ""}
      </button>

      {open ? (
        <div className="related-history__body">
          {items === undefined ? (
            <p className="related-history__reason">Loading related history…</p>
          ) : items.length === 0 ? (
            <p className="related-history__reason">No related history found.</p>
          ) : (
            <>
              {before.length > 0 ? (
                <section className="related-history__section">
                  <p className="related-history__section-label">Before</p>
                  <ul className="related-history__list">
                    {before.map((item) => (
                      <RelatedHistoryItemRow key={item.link.id} item={item} />
                    ))}
                  </ul>
                </section>
              ) : null}
              {after.length > 0 ? (
                <section className="related-history__section">
                  <p className="related-history__section-label">After</p>
                  <ul className="related-history__list">
                    {after.map((item) => (
                      <RelatedHistoryItemRow key={item.link.id} item={item} />
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
