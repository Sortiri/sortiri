"use client";

import Link from "next/link";
import { getEntityHref, getEntityResolveKey } from "@/lib/entities/links";
import { getEntityTypeLabel } from "@/lib/entities/format";
import type { EntityType, EventEntity } from "@/types/events";

type EntityLinkProps = {
  entity?: EventEntity;
  entityId?: string | null;
  label?: string;
};

export function EntityLink({ entity, entityId, label }: EntityLinkProps) {
  if (!entity && !entityId) return null;

  const displayName = label ?? entity?.name ?? entity?.id;
  if (!displayName) return null;

  if (entityId) {
    return (
      <p className="timeline-event-card__entity-link">
        <span className="entity-link__label">
          {entity ? getEntityTypeLabel(entity.type) : "Entity"}
        </span>
        <Link href={getEntityHref(entityId)} className="entity-link">
          {displayName}
        </Link>
      </p>
    );
  }

  return (
    <p className="timeline-event-card__entity-link">
      {entity ? (
        <>
          <span className="entity-link__label">{getEntityTypeLabel(entity.type)}</span>
          <span className="entity-link entity-link--static">{displayName}</span>
        </>
      ) : null}
    </p>
  );
}

export function buildEntityResolveCandidates(
  events: Array<{ entity?: EventEntity; actor: { id?: string; email?: string; name?: string }; source: string }>,
): Array<{ type: EntityType; key: string }> {
  const map = new Map<string, { type: EntityType; key: string }>();

  for (const event of events) {
    if (event.entity) {
      const key = event.entity.id ?? event.entity.name;
      if (key) {
        const lookup = getEntityResolveKey(event.entity.type, key);
        map.set(lookup, { type: event.entity.type, key });
      }
    }
    const actorKey = event.actor.id ?? event.actor.email ?? event.actor.name;
    if (actorKey) {
      const lookup = getEntityResolveKey("actor", actorKey);
      map.set(lookup, { type: "actor", key: actorKey });
    }
    if (event.source) {
      const lookup = getEntityResolveKey("source", event.source);
      map.set(lookup, { type: "source", key: event.source });
    }
  }

  return Array.from(map.values());
}

export function lookupResolvedEntityId(
  resolveMap: Record<string, string | null> | undefined,
  type: EntityType,
  key: string,
): string | null {
  if (!resolveMap) return null;
  return resolveMap[getEntityResolveKey(type, key)] ?? null;
}
