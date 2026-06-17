import type { ReactNode } from "react";

type PlatformCardProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "article";
};

export function PlatformCard({ children, className, as: Tag = "div" }: PlatformCardProps) {
  const classes = ["platform-card", className].filter(Boolean).join(" ");
  return <Tag className={classes}>{children}</Tag>;
}
