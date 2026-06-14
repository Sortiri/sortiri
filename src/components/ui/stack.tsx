import * as React from "react";

type Gap = "none" | "small-100" | "small-200" | "base";

const gapClasses: Record<Gap, string> = {
  none: "gap-0",
  "small-100": "gap-1",
  "small-200": "gap-2",
  base: "gap-4",
};

type StackProps = React.HTMLAttributes<HTMLDivElement> & {
  direction?: "block" | "inline";
  gap?: Gap;
};

export function Stack({
  direction = "block",
  gap = "base",
  className = "",
  ...props
}: StackProps) {
  const directionClass = direction === "block" ? "flex-col" : "flex-row flex-wrap items-center";
  return (
    <div
      className={`flex ${directionClass} ${gapClasses[gap]} ${className}`.trim()}
      {...props}
    />
  );
}
