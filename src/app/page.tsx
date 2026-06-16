import { HeroCodeCard } from "@/components/landing/code-card/hero-code-card";
import { HeroInstallCard } from "@/components/landing/code-card/hero-install-card";
import { LandingHeader } from "@/components/landing/header";
import { LandingPageShell } from "@/components/landing/page-shell";
import { LandingSectionSeparator } from "@/components/landing/section-separator";
import { LandingSiteCtaSection } from "@/components/landing/site-cta-section";
import { LandingSiteFooter } from "@/components/landing/site-footer";
import { LandingTestimonialsSection } from "@/components/landing/testimonials-section";
import { StartButton } from "@/components/landing/start-button";
import { ViewDocsButton } from "@/components/landing/view-docs-button";
import { LandingHighlightsSection } from "@/components/landing/highlights-section";
import { LandingUseCasesSection } from "@/components/landing/use-cases-section";
import { LandingWhySection } from "@/components/landing/why-section";
import { inter } from "@/lib/inter";
import { ppMondwest } from "@/lib/landing-fonts";
import { Zap } from "pixelarticons/react/Zap";
import { INSTALL_CODE_TABS } from "@/components/landing/code-card/snippets";
import "./landing.css";

export default function Home() {
  return (
    <div className="landing landing-page min-h-dvh bg-black text-white">
      <LandingPageShell>
        <LandingHeader />

        <main className="flex min-w-0 flex-1 flex-col overflow-x-clip px-6 pb-12 sm:px-8">
          <section className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-8 py-10 text-center sm:gap-10">
            <div className="flex flex-col items-center gap-6 sm:gap-8">
              <h1 className={`${inter.className} max-w-3xl text-[clamp(2.25rem,5vw+0.75rem,4rem)] font-normal leading-[1.08] text-white`}>
                The{" "}
                <span className={`${ppMondwest.className} text-[#00E013] text-[clamp(2.5rem,5.5vw+0.75rem,4.25rem)]`}>timeline layer</span> for
                AI-native companies
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <Zap width={14} height={14} className="text-[#00E013]" />
                  <span className={`${inter.className} text-xs font-medium text-white`}>1 min setup</span>
                </div>
                <StartButton>Get started for free</StartButton>
                <ViewDocsButton />
              </div>
              <HeroInstallCard tabs={INSTALL_CODE_TABS} defaultTabId="npm" />
              <HeroCodeCard />
            </div>
          </section>

          <LandingSectionSeparator />

          <LandingWhySection />

          <LandingSectionSeparator />

          <LandingUseCasesSection />

          <LandingSectionSeparator />

          <LandingHighlightsSection />

          <LandingSectionSeparator />

          <LandingTestimonialsSection />

          <LandingSiteCtaSection />

          <LandingSiteFooter />
        </main>
      </LandingPageShell>
    </div>
  );
}
