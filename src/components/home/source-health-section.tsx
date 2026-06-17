"use client";

import Link from "next/link";
import { getSourceLabel } from "@/lib/events/labels";
import type { EventSource } from "@/types/events";
import type { SourceHealthItem } from "@/types/home";
import "./home.css";

const COMING_SOON_SOURCES = ["Stripe", "PostHog"] as const;

type SourceHealthSectionProps = {
  sourceStatus: SourceHealthItem[];
  compact?: boolean;
};

export function SourceHealthSection({ sourceStatus, compact = false }: SourceHealthSectionProps) {
  return (
    <section className={`home-section${compact ? " home-section--compact" : ""}`}>
      <div className="home-section__header">
        <h2 className="home-section__title">Sources</h2>
        <Link href="/sources" className="home-section__link">
          Manage Sources
        </Link>
      </div>
      <div className={`source-health__list${compact ? " source-health__list--compact" : ""}`}>
        {sourceStatus.map((item) => (
          <div key={item.source} className="source-health__row">
            <p className="source-health__name">
              {getSourceLabel(item.source as EventSource)}
            </p>
            <p
              className={`source-health__status${
                item.connected ? " source-health__status--connected" : ""
              }`}
            >
              {item.connected ? "Connected" : "Not connected"}
            </p>
          </div>
        ))}
        {!compact
          ? COMING_SOON_SOURCES.map((name) => (
              <div key={name} className="source-health__row">
                <p className="source-health__name">{name}</p>
                <p className="source-health__status source-health__status--soon">
                  Coming soon
                </p>
              </div>
            ))
          : null}
      </div>
    </section>
  );
}
