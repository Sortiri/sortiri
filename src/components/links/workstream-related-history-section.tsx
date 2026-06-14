"use client";

import Link from "next/link";
import { formatEventTime } from "@/lib/events/format";
import { getEventTypeLabel } from "@/lib/events/labels";
import { getConfidenceClassName, getConfidenceLabel } from "@/lib/links/confidence";
import { getRelatedEventHref } from "@/lib/links/navigation";
import type { WorkstreamRelatedGroup } from "@/types/event-links";
import "./related-history.css";

type WorkstreamRelatedHistorySectionProps = {
  groups: WorkstreamRelatedGroup[];
};

export function WorkstreamRelatedHistorySection({
  groups,
}: WorkstreamRelatedHistorySectionProps) {
  if (groups.length === 0) return null;

  return (
    <section className="workstream-related-history">
      <h2 className="workstream-related-history__title">Related History</h2>
      {groups.map((group) => (
        <div key={group.label} className="workstream-related-history__group">
          <p className="workstream-related-history__group-label">{group.label}</p>
          <ul className="related-history__list">
            {group.items.map((item) => {
              const related = item.relatedEvent;
              if (!related) return null;
              const typeLabel = getEventTypeLabel(related.type);
              const confidenceLabel = getConfidenceLabel(item.link.confidence);

              return (
                <li key={item.link.id} className="related-history__item">
                  <Link
                    href={getRelatedEventHref(related)}
                    className="related-history__item-title"
                  >
                    {related.title}
                  </Link>
                  <p className="related-history__item-meta">
                    {typeLabel ?? related.type} · {formatEventTime(related.occurredAt)}{" "}
                    <span className={getConfidenceClassName(item.link.confidence)}>
                      {confidenceLabel}
                    </span>
                  </p>
                  <p className="related-history__reason">{item.link.reason}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
