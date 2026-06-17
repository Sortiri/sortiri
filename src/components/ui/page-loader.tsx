import { PixelLoader, type PixelLoaderSize } from "@/components/ui/pixel-loader";

type PageLoaderVariant = "content" | "inline" | "section" | "viewport";

type PageLoaderProps = {
  variant?: PageLoaderVariant;
  size?: PixelLoaderSize;
};

export function PageLoader({ variant = "content", size }: PageLoaderProps) {
  const resolvedSize =
    size ?? (variant === "section" || variant === "inline" ? "sm" : variant === "viewport" ? "lg" : "md");

  return (
    <div
      className={["page-loader", variant !== "content" ? `page-loader--${variant}` : ""]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-label="Loading"
    >
      <PixelLoader size={resolvedSize} />
    </div>
  );
}
