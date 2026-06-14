"use client";

import Link from "next/link";
import type { PinnedViewSummary } from "@/types/saved-views";
import { getViewHref } from "@/types/saved-views";
import "../home/home.css";

type PinnedViewsSectionProps = {
  pinnedViews: PinnedViewSummary[];
};

export function PinnedViewsSection({ pinnedViews }: PinnedViewsSectionProps) {
  return (
    <section className="home-section">
      <div className="home-section__header">
        <h2 className="home-section__title">Pinned Views</h2>
        <Link href="/views" className="home-section__link">
          Manage Views
        </Link>
      </div>

      {pinnedViews.length === 0 ? (
        <p className="home-section__empty">
          No pinned views yet. Pin a view to keep a manager lens close.
        </p>
      ) : (
        pinnedViews.map(({ view, summary }) => (
          <Link key={view.id} href={getViewHref(view.id)} className="home-section__item">
            <span className="home-section__item-title">{view.name}</span>
            <span className="home-section__item-meta">{summary}</span>
          </Link>
        ))
      )}
    </section>
  );
}
