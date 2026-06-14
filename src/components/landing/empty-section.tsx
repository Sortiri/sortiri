import { landing } from "@/components/landing/typography";

export function LandingEmptySection({ className = "" }: { className?: string }) {
  return (
    <section
      className={`${landing.section} min-w-0 ${className}`.trim()}
      aria-hidden
    />
  );
}
