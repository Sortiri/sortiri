"use client";

import Link from "next/link";
import {
  formatEntityMeta,
  getEntityTypeLabel,
} from "@/lib/entities/format";
import { getEntityHref } from "@/lib/entities/links";
import type { EntityRecord } from "@/types/entities";
import "../search/search.css";

type SearchEntityResultItemProps = {
  entity: EntityRecord;
  onClick?: () => void;
};

export function SearchEntityResultItem({ entity, onClick }: SearchEntityResultItemProps) {
  const content = (
    <>
      <div className="search-result-item__labels">
        <p className="search-result-item__category">Entity</p>
        <p className="search-result-item__type">{getEntityTypeLabel(entity.type)}</p>
      </div>
      <h3 className="search-result-item__title">{entity.name}</h3>
      <p className="search-result-item__meta">{formatEntityMeta(entity)}</p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="search-result-item" onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <Link href={getEntityHref(entity.id)} className="search-result-item">
      {content}
    </Link>
  );
}
