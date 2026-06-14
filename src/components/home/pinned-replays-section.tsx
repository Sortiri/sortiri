"use client";

import Link from "next/link";
import { PinReplayButton } from "@/components/pinned-replays/pin-replay-button";
import { WorkstreamStatusBadge } from "@/components/workstreams/workstream-status-badge";
import type { PinnedReplayWithWorkstream } from "@/types/pinned-replays";
import "./home.css";

type PinnedReplaysSectionProps = {
  pinnedReplays: PinnedReplayWithWorkstream[];
  workspaceId: string;
};

export function PinnedReplaysSection({
  pinnedReplays,
  workspaceId,
}: PinnedReplaysSectionProps) {
  return (
    <section className="home-section">
      <div className="home-section__header">
        <h2 className="home-section__title">Pinned Replays</h2>
        <Link href="/workstreams" className="home-section__link">
          Browse Workstreams
        </Link>
      </div>
      {pinnedReplays.length === 0 ? (
        <p className="home-section__empty">
          No pinned replays yet. Pin important workstreams to keep them close.
        </p>
      ) : (
        pinnedReplays.map(({ pin, workstream }) => (
          <article key={pin.id} className="home-workstream-card">
            <div className="home-workstream-card__top">
              <h3 className="home-workstream-card__title">{workstream.title}</h3>
              <WorkstreamStatusBadge status={workstream.status} />
            </div>
            {workstream.summary ? (
              <p className="home-workstream-card__summary">{workstream.summary}</p>
            ) : null}
            <div className="home-workstream-card__actions">
              <Link
                href={`/workstreams/${workstream.id}`}
                className="home-workstream-card__link"
              >
                Open Replay
              </Link>
              <PinReplayButton
                workspaceId={workspaceId}
                workstreamId={workstream.id}
                compact
              />
            </div>
          </article>
        ))
      )}
    </section>
  );
}
