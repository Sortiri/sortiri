import Link from "next/link";
import type { ReactNode } from "react";
import { landing } from "@/components/landing/typography";

const LEARN_MORE_HREF = "#";

export function LearnMoreButton({
  className = "",
  href = LEARN_MORE_HREF,
  children = "Learn more",
}: {
  className?: string;
  href?: string;
  children?: ReactNode;
}) {
  return (
    <Link href={href} className={`${landing.buttonPrimary} ${className}`}>
      {children}
    </Link>
  );
}
