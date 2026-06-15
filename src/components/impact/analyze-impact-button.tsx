"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateImpactAnalysisModal } from "@/components/impact/create-impact-analysis-modal";

type AnalyzeImpactButtonProps = {
  workspaceId: string;
  anchor: {
    type: "event" | "workstream" | "project" | "view" | "entity" | "manual";
    eventId?: string;
    workstreamId?: string;
    projectId?: string;
    viewId?: string;
    entityId?: string;
    title: string;
    occurredAt?: number;
  };
  projectId?: string;
  viewId?: string;
  className?: string;
  label?: string;
};

export function AnalyzeImpactButton({
  workspaceId,
  anchor,
  projectId,
  viewId,
  className = "impact-detail__action",
  label = "Analyze Impact",
}: AnalyzeImpactButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <CreateImpactAnalysisModal
          workspaceId={workspaceId}
          anchor={anchor}
          projectId={projectId}
          viewId={viewId}
          onClose={() => setOpen(false)}
          onCreated={(analysisId) => router.push(`/impact/${analysisId}`)}
        />
      ) : null}
    </>
  );
}
