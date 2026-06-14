"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useArtifactDrawer } from "@/components/artifacts/artifact-context";

type ArtifactPreviewProps = {
  artifactIds: string[];
  compact?: boolean;
};

export function ArtifactPreview({ artifactIds, compact = false }: ArtifactPreviewProps) {
  const { openArtifact } = useArtifactDrawer();

  const artifacts = useQuery(
    api.artifacts.listByIds,
    artifactIds.length > 0
      ? { artifactIds: artifactIds as Id<"artifacts">[] }
      : "skip",
  );

  if (artifactIds.length === 0) {
    return null;
  }

  if (artifacts === undefined) {
    return <p className="artifact-preview artifact-preview--loading">Loading artifacts…</p>;
  }

  if (artifacts.length === 0) {
    return (
      <p className="artifact-preview">
        {artifactIds.length} artifact{artifactIds.length === 1 ? "" : "s"}
      </p>
    );
  }

  if (compact && artifacts.length === 1) {
    const artifact = artifacts[0]!;
    return (
      <div className="artifact-preview">
        <p className="artifact-preview__label">Artifact</p>
        <button
          type="button"
          className="artifact-preview__button"
          onClick={() => openArtifact(artifact.id)}
        >
          {artifact.title}
        </button>
      </div>
    );
  }

  return (
    <div className="artifact-preview">
      <p className="artifact-preview__label">
        {artifacts.length} artifact{artifacts.length === 1 ? "" : "s"}
      </p>
      <ul className="artifact-preview__list">
        {artifacts.map((artifact) => (
          <li key={artifact.id}>
            <button
              type="button"
              className="artifact-preview__button"
              onClick={() => openArtifact(artifact.id)}
            >
              {artifact.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
