import Link from "next/link";
import type { ReactNode } from "react";

type PlatformObjectCardAction = {
  label: string;
  href: string;
};

type PlatformObjectCardProps = {
  href: string;
  title: string;
  badge?: ReactNode;
  description?: string;
  meta?: ReactNode;
  stats?: ReactNode;
  footer?: ReactNode;
  actions?: PlatformObjectCardAction[];
  className?: string;
};

export function PlatformObjectCard({
  href,
  title,
  badge,
  description,
  meta,
  stats,
  footer,
  actions,
  className,
}: PlatformObjectCardProps) {
  const classes = ["platform-object-card", className].filter(Boolean).join(" ");

  return (
    <article className={classes}>
      <Link href={href} className="platform-object-card__main">
        <div className="platform-object-card__header">
          <h3 className="platform-object-card__title">{title}</h3>
          {badge}
        </div>
        {description ? (
          <p className="platform-object-card__description">{description}</p>
        ) : null}
        {meta ? <div className="platform-object-card__meta">{meta}</div> : null}
        {stats ? <div className="platform-object-card__stats">{stats}</div> : null}
        {footer ? <div className="platform-object-card__footer">{footer}</div> : null}
      </Link>
      {actions && actions.length > 0 ? (
        <div className="platform-object-card__actions">
          {actions.map((action) => (
            <Link key={action.label} href={action.href} className="platform-object-card__action">
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}
