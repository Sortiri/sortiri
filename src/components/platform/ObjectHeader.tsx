import Link from "next/link";
import type { ReactNode } from "react";

type ObjectHeaderProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  badges?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function ObjectHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  badges,
  meta,
  actions,
}: ObjectHeaderProps) {
  return (
    <header className="object-header">
      {backHref ? (
        <Link href={backHref} className="object-header__back">
          ← {backLabel}
        </Link>
      ) : null}
      <div className="object-header__top">
        <div className="object-header__title-row">
          <h1 className="object-header__title">{title}</h1>
          {badges}
        </div>
        {actions ? <div className="object-header__actions">{actions}</div> : null}
      </div>
      {description ? <p className="object-header__description">{description}</p> : null}
      {meta ? <div className="object-header__meta">{meta}</div> : null}
    </header>
  );
}
