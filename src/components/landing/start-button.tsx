import Link from "next/link";
import type { ReactNode } from "react";
import { landing } from "@/components/landing/typography";

const START_HREF = "/sign-up";

export function StartButton({
  className = "",
  size = "default",
  children = "Start",
}: {
  className?: string;
  size?: "default" | "sm";
  children?: ReactNode;
}) {
  const styles = size === "sm" ? landing.buttonPrimarySm : landing.buttonPrimary;

  return (
    <Link href={START_HREF} className={`${styles} ${className}`}>
      {children}
    </Link>
  );
}
