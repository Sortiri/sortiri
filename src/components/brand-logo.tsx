import Image from "next/image";

type BrandLogoProps = {
  width?: number;
};

export function BrandLogo({ width = 20 }: BrandLogoProps) {
  return (
    <Image
      src="/sortiri-mark.png"
      alt="Sortiri"
      width={width}
      height={width}
      className="h-auto w-auto"
      style={{ width, height: "auto" }}
      priority
    />
  );
}
