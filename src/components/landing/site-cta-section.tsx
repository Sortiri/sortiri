import Link from "next/link";
import { CtaInstallCard } from "@/components/landing/code-card/cta-install-card";
import { landing } from "@/components/landing/typography";
import { inter } from "@/lib/inter";
import { ppMondwest } from "@/lib/landing-fonts";
import { Zap } from "pixelarticons/react/Zap";

const SIGN_UP_HREF = "/sign-up";

export function LandingSiteCtaSection() {
  return (
    <section
      id="get-started"
      className="min-w-0 overflow-x-clip border-t border-[var(--landing-grid-line)]"
    >
      <div className="relative overflow-hidden px-0 py-20 sm:py-28">
        <p
          aria-hidden
          className={`${landing.watermark} absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center`}
        >
          sortiri
        </p>

        <div className="relative z-10 flex flex-col items-center gap-6 text-center sm:gap-8">
          <h2 className={`${inter.className} max-w-2xl ${landing.ctaHeadline}`}>
            Every decision deserves a{" "}
            <span className={`${ppMondwest.className} text-[#c490e8] ${landing.ctaHeadlineAccent}`}>replay</span>
          </h2>

          <div className="flex w-full max-w-md flex-col items-center gap-4">
            <Link href={SIGN_UP_HREF} className={landing.buttonPrimary}>
              Start your company timeline
              <span aria-hidden className="ml-1">
                →
              </span>
            </Link>
            <div className="mt-1 flex items-center gap-1.5 sm:mt-2">
              <Zap width={14} height={14} className="text-[#c490e8]" />
              <span className={`${inter.className} text-xs font-medium text-white`}>
                1 min setup
              </span>
            </div>
          </div>

          <CtaInstallCard />
        </div>
      </div>
    </section>
  );
}
