"use client";

import Link from "next/link";
import { PinReplayButton } from "@/components/pinned-replays/pin-replay-button";
import { WorkstreamStatusBadge } from "@/components/workstreams/workstream-status-badge";
import {
  formatWorkstreamTime,
  getCreatedByLabel,
} from "@/lib/workstreams/format";
import type { Workstream } from "@/types/events";
import "./home.css";

type ActiveWorkstreamsSectionProps = {
  workstreams: Workstream[];
  workspaceId: string;
};

export function ActiveWorkstreamsSection({
  workstreams,
  workspaceId,
}: ActiveWorkstreamsSectionProps) {
  return (
    <section className="home-section">
      <div className="home-section__header">
        <h2 className="home-section__title">Active Workstreams</h2>
        <Link href="/workstreams" className="home-section__link">
          Browse Workstreams
        </Link>
      </div>
      {workstreams.length === 0 ? (
        <p className="home-section__empty">
          No active workstreams. Start a task with the Sortiri MCP and it will appear
          here.
        </p>
      ) : (
        workstreams.map((workstream) => (
          <article key={workstream.id} className="home-workstream-card">
            <div className="home-workstream-card__top">
              <h3 className="home-workstream-card__title">{workstream.title}</h3>
              <WorkstreamStatusBadge status={workstream.status} />
            </div>
            {workstream.summary ? (
              <p className="home-workstream-card__summary">{workstream.summary}</p>
            ) : null}
            <p className="home-workstream-card__meta">
              {getCreatedByLabel(workstream.createdBy)} · started{" "}
              {formatWorkstreamTime(workstream.startedAt)}
            </p>
            <div className="home-workstream-card__actions">
              <PinReplayButton
                workspaceId={workspaceId}
                workstreamId={workstream.id}
                compact
              />
              <Link
                href={`/workstreams/${workstream.id}`}
                className="home-workstream-card__link"
              >
                Open Replay
              </Link>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
