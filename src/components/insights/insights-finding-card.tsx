"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { InsightFindingDetail } from "@/types/insights";
import { InsightsEvidence } from "@/components/insights/insights-evidence";
import { EntityFindingLink } from "@/components/insights/entity-finding-link";
import { CreateImpactAnalysisModal } from "@/components/impact/create-impact-analysis-modal";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { EntityType } from "@/types/events";
import "./insights.css";

const TYPE_LABELS: Record<string, string> = {
  hotspot: "Hotspot",
  risk: "Risk",
  sensitive_evidence: "Sensitive Evidence",
  duplicate_work: "Duplicate Work",
  error: "Error",
  stale_workstream: "Stale Workstream",
  product_movement: "Product Movement",
  decision: "Decision",
  summary: "Summary",
  impact_opportunity: "Impact Opportunity",
  lesson_opportunity: "Lesson Opportunity",
  other: "Other",
};

type InsightsFindingCardProps = {
  finding: InsightFindingDetail;
};

export function InsightsFindingCard({ finding }: InsightsFindingCardProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [lessonBusy, setLessonBusy] = useState(false);
  const generateFromInsight = useMutation(api.lessons.generateFromInsightFinding);
  const generateFromFailures = useMutation(api.lessons.generateFromFailurePattern);
  const typeLabel = TYPE_LABELS[finding.type] ?? finding.type;
  const findingData = finding.data as
    | {
        entityType?: EntityType;
        entityKey?: string;
        anchorType?: string;
        anchorId?: string;
        anchorTitle?: string;
        cta?: string;
        impactAnalysisId?: string;
      }
    | undefined;

  const impactAnchor =
    finding.type === "impact_opportunity" &&
    findingData?.anchorType &&
    findingData?.anchorId &&
    findingData?.anchorTitle
      ? {
          type: findingData.anchorType as
            | "event"
            | "workstream"
            | "project"
            | "view"
            | "entity"
            | "manual",
          eventId:
            findingData.anchorType === "event" ? findingData.anchorId : undefined,
          workstreamId:
            findingData.anchorType === "workstream" ? findingData.anchorId : undefined,
          title: findingData.anchorTitle,
        }
      : null;

  return (
    <article className="insights-finding-card">
      <div className="insights-finding-card__header">
        <span
          className={`insights-finding-card__severity insights-finding-card__severity--${finding.severity}`}
        >
          {finding.severity}
        </span>
        <p className="insights-finding-card__type">{typeLabel}</p>
      </div>
      <h3 className="insights-finding-card__title">{finding.title}</h3>
      <p className="insights-finding-card__summary">{finding.summary}</p>
      {finding.recommendation ? (
        <p className="insights-finding-card__recommendation">
          Recommendation: {finding.recommendation}
        </p>
      ) : null}
      {impactAnchor && activeWorkspaceId ? (
        <p className="insights-finding-card__recommendation">
          <button
            type="button"
            className="insights-finding-card__cta"
            onClick={() => setShowImpactModal(true)}
          >
            Analyze impact
          </button>
        </p>
      ) : null}
      {finding.type === "lesson_opportunity" && activeWorkspaceId ? (
        <p className="insights-finding-card__recommendation">
          {findingData?.cta === "generate_failure_lesson" ? (
            <button
              type="button"
              className="insights-finding-card__cta"
              disabled={lessonBusy}
              onClick={() => {
                setLessonBusy(true);
                void generateFromFailures({ workspaceId: activeWorkspaceId }).finally(() =>
                  setLessonBusy(false),
                );
              }}
            >
              Generate lesson from failures
            </button>
          ) : (
            <button
              type="button"
              className="insights-finding-card__cta"
              disabled={lessonBusy}
              onClick={() => {
                setLessonBusy(true);
                void generateFromInsight({
                  insightFindingId: finding.id as Id<"insightFindings">,
                }).finally(() => setLessonBusy(false));
              }}
            >
              Generate lesson
            </button>
          )}
          <Link href="/playbooks" className="insights-finding-card__cta" style={{ marginLeft: "0.5rem" }}>
            View playbooks
          </Link>
        </p>
      ) : null}
      {finding.type === "sensitive_evidence" ? (
        <p className="insights-finding-card__recommendation">
          <Link href="/security/evidence">Open Evidence Review</Link>
        </p>
      ) : null}
      {activeWorkspaceId &&
      findingData?.entityType &&
      findingData?.entityKey ? (
        <EntityFindingLink
          workspaceId={activeWorkspaceId}
          entityType={findingData.entityType}
          entityKey={findingData.entityKey}
        />
      ) : null}
      <InsightsEvidence
        events={finding.evidence.events}
        workstreams={finding.evidence.workstreams}
        relatedEvents={finding.evidence.relatedEvents}
      />
      {showImpactModal && activeWorkspaceId && impactAnchor ? (
        <CreateImpactAnalysisModal
          workspaceId={activeWorkspaceId}
          anchor={impactAnchor}
          onClose={() => setShowImpactModal(false)}
          onCreated={() => setShowImpactModal(false)}
        />
      ) : null}
    </article>
  );
}
