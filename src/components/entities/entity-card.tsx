"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  formatEntityMeta,
  getEntityTypeLabel,
} from "@/lib/entities/format";
import { getProjectHref } from "@/lib/projects/format";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { EntityRecord } from "@/types/entities";
import "./entities.css";

type EntityCardProps = {
  entity: EntityRecord;
};

export function EntityCard({ entity }: EntityCardProps) {
  const { activeWorkspaceId } = useWorkspace();

  const resolvedProjectId = useQuery(
    api.projects.resolveForEntity,
    activeWorkspaceId && entity.type === "project"
      ? {
          workspaceId: activeWorkspaceId,
          key: entity.key,
          name: entity.name,
        }
      : "skip",
  );

  const href =
    entity.type === "project" && resolvedProjectId
      ? getProjectHref(resolvedProjectId)
      : `/entities/${entity.id}`;

  return (
    <Link href={href} className="entity-card">
      <p className="entity-card__type">{getEntityTypeLabel(entity.type)}</p>
      <h3 className="entity-card__name">{entity.name}</h3>
      <p className="entity-card__meta">{formatEntityMeta(entity)}</p>
    </Link>
  );
}
