import "./pixel-loader.css";

export type PixelLoaderSize = "sm" | "md" | "lg";

type PixelLoaderProps = {
  size?: PixelLoaderSize;
  className?: string;
};

const DOT_COUNT: Record<PixelLoaderSize, number> = {
  sm: 3,
  md: 9,
  lg: 9,
};

export function PixelLoader({ size = "md", className }: PixelLoaderProps) {
  const count = DOT_COUNT[size];

  return (
    <div
      className={["pixel-loader", `pixel-loader--${size}`, className].filter(Boolean).join(" ")}
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="pixel-loader__dot" />
      ))}
    </div>
  );
}
