import type { ReactNode } from "react";

type PlatformSectionHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PlatformSectionHeader({
  title,
  description,
  actions,
}: PlatformSectionHeaderProps) {
  return (
    <header className="platform-section-header">
      <div className="platform-section-header__text">
        <h2 className="platform-section-header__title">{title}</h2>
        {description ? (
          <p className="platform-section-header__description">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="platform-section-header__actions">{actions}</div> : null}
    </header>
  );
}
