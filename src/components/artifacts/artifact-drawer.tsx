"use client";

import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatEventTime } from "@/lib/events/format";
import { formatDurationMs } from "@/lib/events/commandMeta";
import { DiffBlock } from "@/components/artifacts/diff-block";
import { useArtifactDrawer } from "@/components/artifacts/artifact-context";
import {
  EvidenceSafetyBadges,
  EvidenceSafetyNote,
} from "@/components/security/evidence-safety-badges";
import "./artifacts.css";

function getCommandMetadata(metadata: unknown): {
  command?: string;
  exitCode?: number;
  durationMs?: number;
} {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }
  const record = metadata as Record<string, unknown>;
  return {
    command: typeof record.command === "string" ? record.command : undefined,
    exitCode: typeof record.exitCode === "number" ? record.exitCode : undefined,
    durationMs: typeof record.durationMs === "number" ? record.durationMs : undefined,
  };
}

export function ArtifactDrawer() {
  const { artifactId, auditReportId, closeArtifact } = useArtifactDrawer();

  const artifact = useQuery(
    api.artifacts.getById,
    artifactId
      ? {
          artifactId: artifactId as Id<"artifacts">,
          auditReportId: auditReportId
            ? (auditReportId as Id<"auditReports">)
            : undefined,
        }
      : "skip",
  );

  useEffect(() => {
    if (!artifactId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeArtifact();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [artifactId, closeArtifact]);

  if (!artifactId) {
    return null;
  }

  const commandMeta =
    artifact?.type === "command_output" ? getCommandMetadata(artifact.metadata) : {};
  const eyebrow =
    artifact?.type === "command_output" ? "Command Output" : (artifact?.type ?? "artifact");

  return (
    <div className="artifact-drawer-root">
      <button
        type="button"
        className="artifact-drawer-backdrop"
        aria-label="Close artifact viewer"
        onClick={closeArtifact}
      />
      <aside className="artifact-drawer-panel" aria-label="Artifact viewer">
        <header className="artifact-drawer-header">
          <div>
            <p className="artifact-drawer-eyebrow">{eyebrow}</p>
            <h2 className="artifact-drawer-title">
              {artifact === undefined ? "Loading…" : artifact?.title ?? "Artifact not found"}
            </h2>
            {artifact ? <EvidenceSafetyBadges item={artifact} /> : null}
          </div>
          <button type="button" className="artifact-drawer-close" onClick={closeArtifact}>
            Close
          </button>
        </header>

        {artifact === undefined ? (
          <p className="artifact-drawer-loading">Loading artifact…</p>
        ) : artifact === null ? (
          <p className="artifact-drawer-empty">Artifact not found.</p>
        ) : (
          <div className="artifact-drawer-body">
            {artifact.summary ? (
              <p className="artifact-drawer-summary">{artifact.summary}</p>
            ) : null}
            {artifact ? <EvidenceSafetyNote item={artifact} /> : null}

            <dl className="artifact-drawer-meta">
              {commandMeta.command ? (
                <>
                  <dt>Command</dt>
                  <dd>
                    <code>{commandMeta.command}</code>
                  </dd>
                </>
              ) : null}
              {commandMeta.exitCode !== undefined ? (
                <>
                  <dt>Exit code</dt>
                  <dd>{commandMeta.exitCode}</dd>
                </>
              ) : null}
              {commandMeta.durationMs !== undefined ? (
                <>
                  <dt>Duration</dt>
                  <dd>{formatDurationMs(commandMeta.durationMs)}</dd>
                </>
              ) : null}
              {artifact.filePath ? (
                <>
                  <dt>File</dt>
                  <dd>
                    <code>{artifact.filePath}</code>
                  </dd>
                </>
              ) : null}
              <dt>Created</dt>
              <dd>{formatEventTime(artifact.createdAt)}</dd>
              {artifact.truncated ? (
                <>
                  <dt>Status</dt>
                  <dd>Truncated for safety</dd>
                </>
              ) : null}
            </dl>

            {artifact.url ? (
              <p className="artifact-drawer-url">
                <a href={artifact.url} target="_blank" rel="noreferrer">
                  {artifact.url}
                </a>
              </p>
            ) : null}

            {artifact.content ? (
              artifact.type === "diff" || artifact.language === "diff" ? (
                <DiffBlock content={artifact.content} />
              ) : (
                <pre
                  className={`artifact-drawer-content${
                    artifact.type === "command_output"
                      ? " artifact-drawer-content--command"
                      : ""
                  }`}
                >
                  {artifact.content}
                </pre>
              )
            ) : (
              <p className="artifact-drawer-empty">No preview content for this artifact.</p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
