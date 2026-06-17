import type { ReactNode } from "react";

type PlatformListProps = {
  children: ReactNode;
  className?: string;
};

export function PlatformList({ children, className }: PlatformListProps) {
  const classes = ["platform-list", className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}
