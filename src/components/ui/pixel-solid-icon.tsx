import {
  PIXELARTICONS_SOLID_PATHS,
  type PixelarticonsSolidName,
} from "@/lib/pixelarticons-solid-paths";
import { pixelIconClass } from "@/components/ui/pixel-icon";
import type { ComponentType, SVGProps } from "react";

export function createPixelSolidIcon(
  name: PixelarticonsSolidName,
): ComponentType<SVGProps<SVGSVGElement>> {
  const path = PIXELARTICONS_SOLID_PATHS[name];

  function PixelSolidIcon(props: SVGProps<SVGSVGElement>) {
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
        <path d={path} />
      </svg>
    );
  }

  PixelSolidIcon.displayName = `PixelSolid${name}`;
  return PixelSolidIcon;
}

export const PixelSolidHome = createPixelSolidIcon("home");
export const PixelSolidPlay = createPixelSolidIcon("play");
export const PixelSolidGrid3x3 = createPixelSolidIcon("grid3x3");
export const PixelSolidMessage = createPixelSolidIcon("message");
export const PixelSolidShield = createPixelSolidIcon("shield");
export const PixelSolidNote = createPixelSolidIcon("note");
export const PixelSolidZap = createPixelSolidIcon("zap");
export const PixelSolidSettings2 = createPixelSolidIcon("settings2");

export { pixelIconClass };
