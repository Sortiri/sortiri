import { BookOpen } from "pixelarticons/react/BookOpen";
import { Bookmark } from "pixelarticons/react/Bookmark";
import { Clipboard } from "pixelarticons/react/Clipboard";
import { Box } from "pixelarticons/react/Box";
import { Folder } from "pixelarticons/react/Folder";
import { FolderSharp } from "pixelarticons/react/FolderSharp";
import { Chart } from "pixelarticons/react/Chart";
import { ChartSharp } from "pixelarticons/react/ChartSharp";
import { Database } from "pixelarticons/react/Database";
import { File } from "pixelarticons/react/File";
import { FileSharp } from "pixelarticons/react/FileSharp";
import { Grid3x3 } from "pixelarticons/react/Grid3x3";
import { Home } from "pixelarticons/react/Home";
import { HomeSharp } from "pixelarticons/react/HomeSharp";
import { Play } from "pixelarticons/react/Play";
import { Scale } from "pixelarticons/react/Scale";
import { ScrollVertical } from "pixelarticons/react/ScrollVertical";
import { Settings2 } from "pixelarticons/react/Settings2";
import { Sparkle } from "pixelarticons/react/Sparkle";
import { Sparkles } from "pixelarticons/react/Sparkles";
import {
  PixelSolidGrid3x3,
  PixelSolidMessage,
  PixelSolidSettings2,
} from "@/components/ui/pixel-solid-icon";
import { PixelIcon, type PixelIconComponent } from "@/components/ui/pixel-icon";
import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

function PixelMessageOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <path d="M20 2H4v2h16zm0 14H6v2h14zm2-12h-2v12h2zM4 4H2v18h2zm2 14H4v2h2z" />
    </svg>
  );
}

const iconOutlineMap = {
  home: Home,
  timeline: ScrollVertical,
  projects: Folder,
  workstreams: Play,
  entities: Box,
  views: Bookmark,
  intelligence: Sparkles,
  impact: Scale,
  lessons: BookOpen,
  playbooks: Clipboard,
  ask: PixelMessageOutline,
  insights: Chart,
  audits: File,
  sources: Database,
  settings: Settings2,
} as const satisfies Record<string, PixelIconComponent>;

const iconSolidMap: Record<keyof typeof iconOutlineMap, PixelIconComponent> = {
  home: HomeSharp,
  timeline: ScrollVertical,
  projects: FolderSharp,
  workstreams: Play,
  entities: Box,
  views: Bookmark,
  intelligence: Sparkle,
  impact: Scale,
  lessons: BookOpen,
  playbooks: Clipboard,
  ask: PixelSolidMessage,
  insights: ChartSharp,
  audits: FileSharp,
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
