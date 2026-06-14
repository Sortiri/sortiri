"use client";

import Link from "next/link";
import type {
  InsightEvidenceEvent,
  InsightEvidenceWorkstream,
} from "@/types/insights";
import { useArtifactDrawer } from "@/components/artifacts/artifact-context";
import { getRelatedEventHref } from "@/lib/links/navigation";
import "./insights.css";
import "@/components/links/related-history.css";

type InsightsEvidenceProps = {
  events: InsightEvidenceEvent[];
  workstreams: InsightEvidenceWorkstream[];
  relatedEvents?: InsightEvidenceEvent[];
};

export function InsightsEvidence({
  events,
  workstreams,
  relatedEvents = [],
}: InsightsEvidenceProps) {
  const { openArtifact } = useArtifactDrawer();

  if (events.length === 0 && workstreams.length === 0 && relatedEvents.length === 0) {
    return null;
  }

  return (
    <div className="insights-evidence">
      <p className="insights-evidence__label">Evidence</p>
      <div className="insights-evidence__list">
        {workstreams.map((workstream) => (
          <Link
            key={workstream.id}
            href={`/workstreams/${workstream.id}`}
            className="insights-evidence__link"
          >
            View Replay — {workstream.title}
          </Link>
        ))}
        {events.map((event) => (
          <div key={event.id} className="insights-evidence__item">
            <Link href={getRelatedEventHref(event)} className="insights-evidence__link">
              {event.workstreamId ? "View Replay" : "View Timeline"} — {event.title}
            </Link>
            {event.artifactCount && event.artifactCount > 0 ? (
              <p className="insights-evidence__artifact">
                {event.primaryArtifactId && event.primaryArtifactTitle ? (
                  <>
                    Artifact:{" "}
                    <button
                      type="button"
                      className="insights-evidence__artifact-button"
                      onClick={() => openArtifact(event.primaryArtifactId!)}
                    >
                      {event.primaryArtifactTitle}
                    </button>
                  </>
                ) : (
                  `${event.artifactCount} artifact${event.artifactCount === 1 ? "" : "s"} attached`
                )}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      {relatedEvents.length > 0 ? (
        <div className="insights-evidence__related">
          <p className="insights-evidence__related-label">Related work</p>
          <div className="insights-evidence__list">
            {relatedEvents.map((event) => (
              <Link
                key={event.id}
                href={getRelatedEventHref(event)}
                className="insights-evidence__link"
              >
                {event.workstreamId ? "View Replay" : "View Timeline"} — {event.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
