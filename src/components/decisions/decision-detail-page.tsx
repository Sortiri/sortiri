"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ObjectHeader, ObjectMetaRow, StatusBadge } from "@/components/platform";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { formatEventTime } from "@/lib/events/format";
import "./decision-detail.css";

type DecisionDetailPageProps = {
  decisionId: string;
};

function decisionStatusTone(
  status: string,
): "success" | "warning" | "error" | "info" | "neutral" {
  switch (status) {
    case "active":
      return "success";
    case "rolled_back":
      return "warning";
    case "superseded":
    case "archived":
      return "neutral";
    default:
      return "neutral";
  }
}

export function DecisionDetailPage({ decisionId }: DecisionDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const data = useQuery(
    api.decisions.getDecision,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          decisionId: decisionId as Id<"decisions">,
        }
      : "skip",
  );

  if (!activeWorkspaceId) return <p>Select a workspace.</p>;
  if (data === undefined) return <PageLoader />;
  if (!data) return <p>Decision not found.</p>;

  const { decision, rollbacks } = data;

  return (
    <div className="decision-detail-page">
      <ObjectHeader
        backHref="/timeline/decisions"
        backLabel="Decisions"
        title={decision.title}
        badges={
          <StatusBadge label={decision.status} tone={decisionStatusTone(decision.status)} />
        }
        actions={
          <Link href={`/ask?decisionId=${decision.id}`} className="decision-detail-page__ask-link">
            Ask about this decision
          </Link>
        }
        meta={
          <ObjectMetaRow
            items={[
              { label: "Type", value: decision.decisionType },
              { label: "Source", value: decision.source },
              { label: "Decided", value: formatEventTime(decision.decidedAt) },
            ]}
          />
        }
      />

      {decision.summary ? (
        <section className="object-section">
          <h2 className="object-section__title">Summary</h2>
          <p className="object-section__body">{decision.summary}</p>
        </section>
      ) : null}

      {decision.rationale ? (
        <section className="object-section">
          <h2 className="object-section__title">Rationale</h2>
          <p className="object-section__body">{decision.rationale}</p>
        </section>
      ) : null}

      {decision.expectedOutcome ? (
        <section className="object-section">
          <h2 className="object-section__title">Expected outcome</h2>
          <p className="object-section__body">{decision.expectedOutcome}</p>
        </section>
      ) : null}

      {decision.rollbackPlan ? (
        <section className="object-section">
          <h2 className="object-section__title">Rollback plan</h2>
          <p className="object-section__body">{decision.rollbackPlan}</p>
        </section>
      ) : null}

      {rollbacks.length ? (
        <section className="object-section">
          <h2 className="object-section__title">Rollbacks</h2>
          <ul className="decision-detail-page__rollback-list">
            {rollbacks.map((r) => (
              <li key={r.id}>{r.title}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
