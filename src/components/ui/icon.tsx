import { Chart } from "pixelarticons/react/Chart";
import { ChartSharp } from "pixelarticons/react/ChartSharp";
import { Database } from "pixelarticons/react/Database";
import { Grid3x3 } from "pixelarticons/react/Grid3x3";
import { Home } from "pixelarticons/react/Home";
import { HomeSharp } from "pixelarticons/react/HomeSharp";
import { ScrollVertical } from "pixelarticons/react/ScrollVertical";
import { Settings2 } from "pixelarticons/react/Settings2";
import {
  PixelSolidGrid3x3,
  PixelSolidSettings2,
} from "@/components/ui/pixel-solid-icon";
import { PixelIcon, type PixelIconComponent } from "@/components/ui/pixel-icon";
import { cn } from "@/lib/utils";

const iconOutlineMap = {
  home: Home,
  timeline: ScrollVertical,
  insights: Chart,
  sources: Database,
  settings: Settings2,
} as const satisfies Record<string, PixelIconComponent>;

const iconSolidMap: Record<keyof typeof iconOutlineMap, PixelIconComponent> = {
  home: HomeSharp,
  timeline: ScrollVertical,
  insights: ChartSharp,
  sources: Grid3x3,
  settings: PixelSolidSettings2,
};

export type IconName = keyof typeof iconOutlineMap;

type AppIconProps = {
  type: IconName;
  size?: "small" | "base";
  tone?: "neutral" | "info" | "brand";
  solid?: boolean;
  className?: string;
};

const SIZE_PX = {
  small: 20,
  base: 24,
} as const;

export function AppIcon({
  type,
  size = "base",
  tone = "neutral",
  solid = false,
  className,
}: AppIconProps) {
  const Icon = solid ? iconSolidMap[type] : iconOutlineMap[type];

  return (
    <PixelIcon
      icon={Icon}
      size={SIZE_PX[size]}
      className={cn(
        tone === "neutral" && "text-[var(--ca-muted)]",
        tone === "info" && "text-[var(--ca-ink)]",
        tone === "brand" && "text-[var(--ca-brand)]",
        className,
      )}
    />
  );
}
