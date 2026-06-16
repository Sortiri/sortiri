import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { landing } from "@/components/landing/typography";
import { FOOTER_LINK_GROUPS } from "@/config/marketing-nav";

const footerColumns = [
  FOOTER_LINK_GROUPS[0],
  FOOTER_LINK_GROUPS[2],
  FOOTER_LINK_GROUPS[4],
] as const;

export function LandingSiteFooter() {
  return (
    <footer className="border-t border-[var(--landing-grid-line)] py-10 sm:py-12">
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-10">
        {footerColumns.map((group) => (
          <div key={group.label}>
            <p className={`${landing.footerHeading} mb-3`}>{group.label}</p>
            <ul className="space-y-2">
              {group.items.map((item) => {
                const isExternal = item.href.startsWith("http");
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={landing.footerLink}
                      {...(isExternal
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-start justify-between gap-5 border-t border-[var(--landing-grid-line)] pt-6 sm:flex-row sm:items-center">
        <Link href="/" aria-label="Sortiri home">
          <BrandLogo size="md" />
        </Link>

        <p className={`${landing.footerTagline} text-right sm:text-left`}>
          The timeline layer for AI-native companies.
        </p>
      </div>
    </footer>
  );
}
