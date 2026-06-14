"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";

type SidebarTooltipProps = {
  label: string;
  children: ReactNode;
};

export function SidebarTooltip({ label, children }: SidebarTooltipProps) {
  return (
    <Tooltip content={label} side="right" align="center" sideOffset={6}>
      {children}
    </Tooltip>
  );
}
