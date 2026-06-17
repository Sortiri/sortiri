"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { EntityCard } from "@/components/entities/entity-card";
import { EntityFilters } from "@/components/entities/entity-filters";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { EntityRecord } from "@/types/entities";
import type { EntityType } from "@/types/events";
import "./entities.css";

export function EntitiesPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const [typeFilter, setTypeFilter] = useState<EntityType | null>(null);

  const entities = useQuery(
    api.entities.listByWorkspace,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          type: typeFilter ?? undefined,
          limit: 100,
        }
      : "skip",
  );

  const loading = wsLoading || (activeWorkspaceId !== null && entities === undefined);
  const entityList = (entities ?? []) as EntityRecord[];
  const isEmpty = !loading && entityList.length === 0;

  return (
    <div className="entities-page">
      <header className="entities-page__header">
        <h1 className="entities-page__title">Entities</h1>
        <p className="entities-page__subtitle">
          Every customer, file, PR, source, and actor with a timeline.
        </p>
      </header>

      <EntityFilters value={typeFilter} onChange={setTypeFilter} />
      {typeFilter === null ? (
        <p className="entities-page__hint">
          Primary entities only. Command entities are under Commands.
        </p>
      ) : null}

      {loading ? (
        <PageLoader variant="inline" />
      ) : isEmpty ? (
        <p className="entities-page__empty">
          No entities yet. Events will create entities as they are recorded, or run
          Backfill entities on the Timeline page.
        </p>
      ) : (
        <div className="entities-list">
          {entityList.map((entity) => (
            <EntityCard key={entity.id} entity={entity} />
          ))}
        </div>
      )}
    </div>
  );
}
