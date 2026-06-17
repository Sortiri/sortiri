import Link from "next/link";
import type { ReactNode } from "react";

type ActionItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  variant?: "primary" | "secondary";
};

type PlatformPageActionsProps = {
  primary?: ActionItem;
  secondary?: ActionItem[];
  overflow?: ReactNode;
};

export function PlatformPageActions({ primary, secondary, overflow }: PlatformPageActionsProps) {
  return (
    <div className="platform-page-actions">
      {secondary?.map((action) =>
        action.href ? (
          <Link
            key={action.label}
            href={action.href}
            className="object-action-bar__secondary"
            title={action.title}
          >
            {action.label}
          </Link>
        ) : (
          <button
            key={action.label}
            type="button"
            className="object-action-bar__secondary"
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title}
          >
            {action.label}
          </button>
        ),
      )}
      {primary ? (
        primary.href ? (
          <Link
            href={primary.href}
            className="object-action-bar__primary"
            title={primary.title}
          >
            {primary.label}
          </Link>
        ) : (
          <button
            type="button"
            className="object-action-bar__primary"
            onClick={primary.onClick}
            disabled={primary.disabled}
            title={primary.title}
          >
            {primary.label}
          </button>
        )
      ) : null}
      {overflow}
    </div>
  );
}
