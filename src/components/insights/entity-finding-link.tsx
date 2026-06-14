"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getEntityHref, getEntityTimelineLinkLabel } from "@/lib/entities/links";
import type { EntityType } from "@/types/events";

type EntityFindingLinkProps = {
  workspaceId: string;
  entityType: EntityType;
  entityKey: string;
};

export function EntityFindingLink({
  workspaceId,
  entityType,
  entityKey,
}: EntityFindingLinkProps) {
  const entity = useQuery(api.entities.getByTypeAndKey, {
    workspaceId,
    type: entityType,
    key: entityKey,
  });

  if (entity === undefined || entity === null) return null;

  return (
    <Link href={getEntityHref(entity.id)} className="insights-finding-card__entity-link">
      {getEntityTimelineLinkLabel(entityType)}
    </Link>
  );
}
