import type { ReactNode } from "react";

type PlatformGridProps = {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
};

export function PlatformGrid({ children, columns = 2, className }: PlatformGridProps) {
  const classes = ["platform-grid", `platform-grid--cols-${columns}`, className]
    .filter(Boolean)
    .join(" ");
  return <div className={classes}>{children}</div>;
}
