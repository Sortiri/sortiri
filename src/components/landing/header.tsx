"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LoginButton } from "@/components/landing/login-button";
import { StartButton } from "@/components/landing/start-button";
import { landing } from "@/components/landing/typography";
import { HEADER_NAV_LINKS } from "@/config/marketing-nav";

function isNavLinkActive(pathname: string, href: string) {
  if (href !== "/pricing") return false;
  return pathname === "/pricing" || pathname.startsWith("/pricing/");
}

export function LandingHeader() {
  const pathname = usePathname();

  return (
    <header className="landing-header sticky top-0 z-20 border-x border-[var(--landing-grid-line)] bg-black">
      <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center px-6 sm:px-8">
        <nav
          className="flex min-w-0 items-center gap-4 sm:gap-5"
          aria-label="Main"
        >
          {HEADER_NAV_LINKS.map((item) => {
            const active = isNavLinkActive(pathname, item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={active ? landing.navLinkActive : landing.navLink}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/" aria-label="Sortiri home" className="justify-self-center">
          <BrandLogo size="md" />
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-2.5">
          <StartButton size="sm" />
          <LoginButton />
        </div>
      </div>
    </header>
  );
}
