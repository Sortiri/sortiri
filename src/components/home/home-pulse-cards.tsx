"use client";

import Link from "next/link";
import { AppIcon, type IconName } from "@/components/ui/icon";
import type { PulseCounts } from "@/types/home";

type PulseCardConfig = {
  id: string;
  label: string;
  value: number;
  href: string;
  hint: string;
  icon: IconName;
};

function buildCards(counts: PulseCounts): PulseCardConfig[] {
  return [
    {
      id: "events-today",
      label: "Events today",
      value: counts.eventsToday,
      href: "/timeline",
      hint: "Open timeline",
      icon: "timeline",
    },
    {
      id: "active-workstreams",
      label: "Active workstreams",
      value: counts.activeWorkstreams,
      href: "/workstreams",
      hint: "View workstreams",
      icon: "workstreams",
    },
    {
      id: "connected-sources",
      label: "Connected sources",
      value: counts.connectedSources,
      href: "/sources",
      hint: "Manage sources",
      icon: "sources",
    },
    {
      id: "agent-actions",
      label: "Agent actions",
      value: counts.agentActionsToday,
      href: "/timeline",
      hint: "Recorded today",
      icon: "ask",
    },
    {
      id: "code-changes",
      label: "Code changes",
      value: counts.codeChangesToday,
      href: "/timeline",
      hint: "Recorded today",
      icon: "projects",
    },
    {
      id: "product-events",
      label: "Product events",
      value: counts.productEventsToday,
      href: "/timeline",
      hint: "Recorded today",
      icon: "insights",
    },
  ];
}

function formatCount(value: number): string {
  return value.toLocaleString();
}

type HomePulseCardsProps = {
  counts: PulseCounts;
};

export function HomePulseCards({ counts }: HomePulseCardsProps) {
  const cards = buildCards(counts);

  return (
    <section className="pulse-cards" aria-label="Workspace pulse">
      <div className="pulse-cards__grid pulse-cards__grid--overview">
        {cards.slice(0, 3).map((card) => (
          <PulseStatCard key={card.id} card={card} variant="primary" />
        ))}
      </div>
      <div className="pulse-cards__activity">
        <p className="pulse-cards__activity-label">Today&apos;s breakdown</p>
        <div className="pulse-cards__grid pulse-cards__grid--activity">
          {cards.slice(3).map((card) => (
            <PulseStatCard key={card.id} card={card} variant="compact" />
          ))}
        </div>
      </div>
    </section>
  );
}

function PulseStatCard({
  card,
  variant,
}: {
  card: PulseCardConfig;
  variant: "primary" | "compact";
}) {
  const isActive = card.value > 0;

  return (
    <Link
      href={card.href}
      className={`pulse-card pulse-card--${variant}${isActive ? " pulse-card--active" : ""}`}
      aria-label={`${formatCount(card.value)} ${card.label.toLowerCase()}, ${card.hint}`}
    >
      <span className="pulse-card__icon" aria-hidden>
        <AppIcon type={card.icon} size="small" tone={isActive ? "brand" : "neutral"} />
      </span>
      <span className="pulse-card__body">
        <span className="pulse-card__value">{formatCount(card.value)}</span>
        <span className="pulse-card__label">{card.label}</span>
        {variant === "primary" ? (
          <span className="pulse-card__hint">{card.hint}</span>
        ) : null}
      </span>
    </Link>
  );
}
