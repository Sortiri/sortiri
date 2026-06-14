import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

export type PixelIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const pixelIconClass = "app-icon shrink-0";

type PixelIconProps = {
  icon: PixelIconComponent;
  size?: number;
} & SVGProps<SVGSVGElement>;

export function PixelIcon({
  icon: Icon,
  size = 24,
  className,
  ...props
}: PixelIconProps) {
  return (
    <Icon
      width={size}
      height={size}
      className={cn(pixelIconClass, className)}
      aria-hidden
      {...props}
    />
  );
}
