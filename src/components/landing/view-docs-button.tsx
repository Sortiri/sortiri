import Link from "next/link";
import { landing } from "@/components/landing/typography";

const DOCS_HREF = "#";

export function ViewDocsButton({
  className = "",
  size = "default",
}: {
  className?: string;
  size?: "default" | "sm";
}) {
  const styles =
    size === "sm" ? landing.buttonSecondary : landing.buttonSecondaryLg;

  return (
    <Link href={DOCS_HREF} className={`${styles} ${className}`}>
      View docs
    </Link>
  );
}
