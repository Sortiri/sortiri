import Link from "next/link";
import { landing } from "@/components/landing/typography";

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
          <h2 className={`${landing.display} max-w-2xl`}>
            Every decision deserves a{" "}
            <span className="text-[#00E013]">replay</span>
          </h2>

          <Link href={SIGN_UP_HREF} className={landing.buttonPrimary}>
            Start recording history
            <span aria-hidden className="ml-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
