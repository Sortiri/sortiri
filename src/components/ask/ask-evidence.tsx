"use client";

import Link from "next/link";
import type { AskEvidenceEvent, AskEvidenceWorkstream } from "@/types/ask";
import { useArtifactDrawer } from "@/components/artifacts/artifact-context";
import { getRelatedEventHref } from "@/lib/links/navigation";
import "./ask.css";

type AskEvidenceProps = {
  events: AskEvidenceEvent[];
  workstreams: AskEvidenceWorkstream[];
};

export function AskEvidence({ events, workstreams }: AskEvidenceProps) {
  const { openArtifact } = useArtifactDrawer();

  if (events.length === 0 && workstreams.length === 0) {
    return null;
  }

  return (
    <section className="ask-evidence">
      <h2 className="ask-evidence__title">Evidence</h2>

      {workstreams.length > 0 ? (
        <div className="ask-evidence__section">
          <p className="ask-evidence__section-label">Workstreams</p>
          <div className="ask-evidence__list">
            {workstreams.map((workstream) => (
              <Link
                key={workstream.id}
                href={`/workstreams/${workstream.id}`}
                className="ask-evidence__link"
              >
                <span className="ask-evidence__link-type">Workstream</span>
                {workstream.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {events.length > 0 ? (
        <div className="ask-evidence__section">
          <p className="ask-evidence__section-label">Events</p>
          <div className="ask-evidence__list">
            {events.map((event) => (
              <div key={event.id} className="ask-evidence__item">
                <Link href={getRelatedEventHref(event)} className="ask-evidence__link">
                  <span className="ask-evidence__link-type">
                    {event.workstreamId ? "Event · Replay" : "Event · Timeline"}
                  </span>
                  {event.title}
                </Link>
                {event.artifactCount && event.artifactCount > 0 ? (
                  <p className="ask-evidence__artifact">
                    {event.primaryArtifactId && event.primaryArtifactTitle ? (
                      <>
                        Contains artifact:{" "}
                        <button
                          type="button"
                          className="ask-evidence__artifact-button"
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
        </div>
      ) : null}
    </section>
  );
}
