"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getEntityHref } from "@/lib/entities/links";

type SourceTimelineLinkProps = {
  workspaceId: string;
  sourceKey: string;
};

export function SourceTimelineLink({ workspaceId, sourceKey }: SourceTimelineLinkProps) {
  const entity = useQuery(api.entities.getByTypeAndKey, {
    workspaceId,
    type: "source",
    key: sourceKey,
  });

  if (entity === undefined || entity === null) return null;

  return (
    <Link href={getEntityHref(entity.id)} className="source-card__timeline-link">
      View source timeline
    </Link>
  );
}
