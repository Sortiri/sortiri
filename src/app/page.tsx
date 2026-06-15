import { LandingEnterpriseDiagramSection } from "@/components/landing/enterprise-diagram-section";
import { LandingEnterpriseSection } from "@/components/landing/enterprise-section";
import { LandingAuditDiagramSection } from "@/components/landing/audit-diagram-section";
import { LandingAuditsSection } from "@/components/landing/audits-section";
import { LandingDecisionTimelineDiagramSection } from "@/components/landing/decision-timeline-diagram-section";
import { LandingTimelineReplaySection } from "@/components/landing/timeline-replay-section";
import { LandingReplayDiagramSection } from "@/components/landing/replay-diagram-section";
import { LandingTimelineDiagramSection } from "@/components/landing/timeline-diagram-section";
import { LandingHeader } from "@/components/landing/header";
import { LandingPageShell } from "@/components/landing/page-shell";
import { LandingReplaySection } from "@/components/landing/replay-section";
import { LandingSectionSeparator } from "@/components/landing/section-separator";
import { LandingSiteCtaSection } from "@/components/landing/site-cta-section";
import { LandingSiteFooter } from "@/components/landing/site-footer";
import { LandingTestimonialsSection } from "@/components/landing/testimonials-section";
import { StartButton } from "@/components/landing/start-button";
import { ViewDocsButton } from "@/components/landing/view-docs-button";
import { LandingWhySection } from "@/components/landing/why-section";
import { landing } from "@/components/landing/typography";
import "./landing.css";

export default function Home() {
  return (
    <div className="landing landing-page min-h-dvh bg-black text-white">
      <LandingPageShell>
        <LandingHeader />

        <main className="flex min-w-0 flex-1 flex-col overflow-x-clip px-6 pb-12 sm:px-8">
          <section className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-8 py-10 text-center sm:gap-10">
            <div className="flex flex-col items-center gap-6 sm:gap-8">
              <h1 className={`${landing.displayHero} max-w-3xl`}>
                The{" "}
                <span className="text-[#00E013]">timeline layer</span> for
                AI-native companies.
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                <StartButton>Start for free</StartButton>
                <ViewDocsButton />
              </div>
            </div>
          </section>

          <LandingSectionSeparator />

          <LandingTimelineDiagramSection />
          <LandingWhySection />

          <LandingSectionSeparator />

          <LandingReplayDiagramSection />
          <LandingReplaySection />

          <LandingSectionSeparator />

          <LandingEnterpriseDiagramSection />
          <LandingEnterpriseSection />

          <LandingSectionSeparator />

          <LandingAuditDiagramSection />
          <LandingAuditsSection />

          <LandingSectionSeparator />

          <LandingDecisionTimelineDiagramSection />
          <LandingTimelineReplaySection />

          <LandingSectionSeparator />

          <LandingTestimonialsSection />

          <LandingSiteCtaSection />

          <LandingSiteFooter />
        </main>
      </LandingPageShell>
    </div>
  );
}
