"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageLoader } from "@/components/ui/page-loader";
import { useArtifactDrawer } from "@/components/artifacts/artifact-context";

type WorkstreamArtifactsSectionProps = {
  workstreamId: string;
};

export function WorkstreamArtifactsSection({ workstreamId }: WorkstreamArtifactsSectionProps) {
  const { openArtifact } = useArtifactDrawer();
  const artifacts = useQuery(api.artifacts.listByWorkstream, {
    workstreamId: workstreamId as Id<"workstreams">,
  });

  if (artifacts === undefined) {
    return (
      <section className="workstream-artifacts">
        <h2 className="workstream-artifacts__title">Artifacts</h2>
        <PageLoader variant="section" />
      </section>
    );
  }

  if (artifacts.length === 0) {
    return null;
  }

  return (
    <section className="workstream-artifacts">
      <h2 className="workstream-artifacts__title">Artifacts</h2>
      <ul className="workstream-artifacts__list">
        {artifacts.map((artifact) => (
          <li key={artifact.id} className="workstream-artifacts__item">
            <button
              type="button"
              className="workstream-artifacts__button"
              onClick={() => openArtifact(artifact.id)}
            >
              {artifact.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
