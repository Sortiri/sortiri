"use client";

import Link from "next/link";
import { GenerateContextPackButton } from "@/components/context/generate-context-pack-button";
import "./context.css";

type IntelligenceAgentContextSectionProps = {
  workspaceId: string;
  recentPacks: Array<{
    id: string;
    title: string;
    goal: string;
    createdAt: number;
  }>;
};

export function IntelligenceAgentContextSection({
  workspaceId,
  recentPacks,
}: IntelligenceAgentContextSectionProps) {
  return (
    <section className="context-hub-section">
      <h2 className="context-hub-section__title">Agent Context</h2>
      <p className="context-page__subtitle">
        Context packs bundle lessons, playbooks, failures, and validation for Cursor agents.
      </p>
      <div className="context-page__actions">
        <GenerateContextPackButton workspaceId={workspaceId} label="Create Context Pack" />
        <Link href="/context" className="context-btn">
          View Context Packs
        </Link>
      </div>
      {recentPacks.length > 0 ? (
        <ul className="context-hub-section__list">
          {recentPacks.map((pack) => (
            <li key={pack.id}>
              <Link href={`/context/${pack.id}`}>{pack.title}</Link>
              <span className="context-page__subtitle"> — {pack.goal}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="context-page__subtitle">No context packs yet.</p>
      )}
    </section>
  );
}
