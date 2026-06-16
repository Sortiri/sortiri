import Image from "next/image";
import { departureMono } from "@/lib/landing-fonts";

const BRAND_SIZES = {
  sm: { icon: 20, text: "text-[0.8125rem]", gap: "gap-1.5" },
  md: { icon: 22, text: "text-[0.9375rem]", gap: "gap-2" },
  lg: { icon: 24, text: "text-base", gap: "gap-2" },
} as const;

type BrandLogoSize = keyof typeof BRAND_SIZES;

type BrandLogoProps = {
  size?: BrandLogoSize;
  showWordmark?: boolean;
  className?: string;
};

export function BrandLogo({
  size = "sm",
  showWordmark = true,
  className,
}: BrandLogoProps) {
  const preset = BRAND_SIZES[size];

  return (
    <span
      className={[
        "inline-flex items-center",
        preset.gap,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Image
        src="/ChatGPT_Image_Jun_16__2026__04_50_53_PM-removebg-preview.png"
        alt=""
        width={preset.icon}
        height={preset.icon}
        className="block shrink-0"
        style={{ width: preset.icon, height: preset.icon }}
        priority
      />
      {showWordmark ? (
        <span
          className={`${departureMono.className} ${preset.text} leading-none tracking-tight text-white`}
          style={{ fontWeight: 900 }}
        >
          Sortiri
        </span>
      ) : null}
    </span>
  );
}
