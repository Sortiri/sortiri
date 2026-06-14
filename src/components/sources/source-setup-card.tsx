"use client";

import { formatEventTime } from "@/lib/events/format";
import { SourceTimelineLink } from "@/components/sources/source-timeline-link";
import { SourceProjectsLabel } from "@/components/projects/source-projects-label";
import { SetupBlock } from "@/components/sources/setup-block";

type SourceSetupCardProps = {
  title: string;
  description: string;
  connected: boolean;
  eventCount?: number;
  lastEventAt?: number;
  setupLabel: string;
  setupCode: string;
  comingSoon?: boolean;
  workspaceId?: string;
  sourceKey?: string;
};

export function SourceSetupCard({
  title,
  description,
  connected,
  eventCount,
  lastEventAt,
  setupLabel,
  setupCode,
  comingSoon = false,
  workspaceId,
  sourceKey,
}: SourceSetupCardProps) {
  return (
    <article className={`source-card${comingSoon ? " source-card--disabled" : ""}`}>
      <div className="source-card__header">
        <h3 className="source-card__title">{title}</h3>
        <span
          className={`source-card__status${
            connected ? " source-card__status--connected" : ""
          }${comingSoon ? " source-card__status--soon" : ""}`}
        >
          {comingSoon ? "Coming soon" : connected ? "Connected" : "Not connected"}
        </span>
      </div>
      <p className="source-card__description">{description}</p>
      {!comingSoon && connected ? (
        <div className="source-card__stats">
          <p>Events recorded: {eventCount ?? 0}</p>
          <p>
            Last event: {lastEventAt ? formatEventTime(lastEventAt) : "—"}
          </p>
          {workspaceId && sourceKey ? (
            <SourceTimelineLink workspaceId={workspaceId} sourceKey={sourceKey} />
          ) : null}
          {workspaceId && sourceKey ? (
            <SourceProjectsLabel workspaceId={workspaceId} source={sourceKey} />
          ) : null}
        </div>
      ) : null}
      {!comingSoon ? <SetupBlock label={setupLabel} code={setupCode} /> : null}
    </article>
  );
}
