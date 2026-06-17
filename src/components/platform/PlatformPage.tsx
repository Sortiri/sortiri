import type { ReactNode } from "react";

type PlatformPageProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: "default" | "wide" | "narrow";
};

const maxWidthClass: Record<NonNullable<PlatformPageProps["maxWidth"]>, string> = {
  default: "platform-page",
  wide: "platform-page platform-page--wide",
  narrow: "platform-page platform-page--narrow",
};

export function PlatformPage({
  children,
  className,
  maxWidth = "default",
}: PlatformPageProps) {
  const classes = [maxWidthClass[maxWidth], className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}
