import Link from "next/link";

type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

type EmptyStateProps = {
  title: string;
  body: string;
  actions?: EmptyStateAction[];
};

export function EmptyState({ title, body, actions }: EmptyStateProps) {
  return (
    <div className="platform-empty-state">
      <h2 className="platform-empty-state__title">{title}</h2>
      <p className="platform-empty-state__body">{body}</p>
      {actions && actions.length > 0 ? (
        <div className="platform-empty-state__actions">
          {actions.map((action) =>
            action.href ? (
              <Link key={action.label} href={action.href} className="object-action-bar__primary">
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                className="object-action-bar__primary"
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
