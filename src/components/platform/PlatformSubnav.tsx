"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type PlatformSubnavItem = {
  href: string;
  label: string;
  matchPrefix?: string;
};

type PlatformSubnavProps = {
  items: PlatformSubnavItem[];
  ariaLabel?: string;
};

export function PlatformSubnav({ items, ariaLabel = "Section navigation" }: PlatformSubnavProps) {
  const pathname = usePathname();

  const isActive = (item: PlatformSubnavItem) => {
    const match = item.matchPrefix ?? item.href.split("#")[0];
    if (match.includes("#")) return false;
    return pathname === match || pathname.startsWith(`${match}/`);
  };

  return (
    <nav className="platform-subnav" aria-label={ariaLabel}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`platform-subnav__link${isActive(item) ? " is-active" : ""}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
