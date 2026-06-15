import { inter } from "@/lib/inter";
import { departureMono, ppMondwest } from "@/lib/landing-fonts";

/** Landing typography — aligned with sortiri-content (dark theme). */
export const landing = {
  section: "py-20 sm:py-28",
  diagramBlock: "pt-20 pb-6 sm:pt-28 sm:pb-8",
  copyBlock: "pt-8 pb-14 sm:pt-10 sm:pb-16",
  copyBlockPaired: "pb-14 sm:pb-16",
  sectionKicker: "mx-auto mb-3 w-full max-w-2xl text-center sm:mb-4",

  displayHero: `${ppMondwest.className} text-[clamp(2.5rem,5.5vw+0.75rem,4.25rem)] font-normal tracking-[-0.02em] leading-[1.08] text-white`,
  display: `${ppMondwest.className} w-full text-center text-[clamp(2rem,4vw+0.75rem,3.25rem)] font-normal tracking-[-0.02em] leading-[1.1] text-white`,
  displayLine: `${ppMondwest.className} text-center text-[clamp(1.625rem,3.2vw+0.5rem,2.75rem)] font-normal tracking-[-0.02em] leading-[1.12] text-white`,

  label: `${departureMono.className} text-[0.625rem] font-normal tracking-[0.12em] text-[#00A60E] sm:text-[0.6875rem]`,
  labelAccent: `${departureMono.className} text-[0.625rem] font-normal tracking-[0.12em] text-[#00A60E] sm:text-[0.6875rem]`,
  navLink: `${departureMono.className} text-[0.625rem] font-normal uppercase tracking-[0.12em] text-white transition-colors hover:text-[var(--ca-ink-secondary)] sm:text-[0.6875rem]`,
  navLinkActive: `${departureMono.className} text-[0.625rem] font-normal uppercase tracking-[0.12em] text-[#00A60E] sm:text-[0.6875rem]`,
  overline: `${ppMondwest.className} text-xs font-normal uppercase tracking-[0.14em] text-[#8A8A8A]`,
  footerHeading: `${departureMono.className} text-[0.625rem] font-normal uppercase tracking-[0.12em] text-[var(--ca-muted)] sm:text-[0.6875rem]`,
  footerLink: `${inter.className} text-sm font-normal text-[var(--ca-ink-secondary)] transition-colors hover:text-[var(--ca-ink)]`,
  footerTagline: `${inter.className} text-sm font-normal leading-snug text-[var(--ca-muted)]`,
  lead: "mx-auto max-w-lg text-center text-lg leading-[1.6] text-[#8A8A8A] sm:text-xl sm:leading-[1.55]",
  body: "text-base leading-[1.65] text-[#8A8A8A] sm:text-lg sm:leading-[1.6]",
  bodyStrong: `${inter.className} text-base leading-[1.65] text-[#E5E5E5] sm:text-lg sm:leading-[1.6]`,

  buttonPrimary: `${inter.className} inline-flex items-center justify-center bg-[#00E013] px-5 py-2.5 text-sm font-medium leading-none text-black transition-opacity hover:opacity-90 sm:px-6 sm:py-3 sm:text-base`,
  buttonPrimarySm: `${inter.className} inline-flex items-center justify-center bg-[#00E013] px-3 py-1.5 text-xs font-medium leading-none text-black transition-opacity hover:opacity-90 sm:px-3.5 sm:py-2 sm:text-sm`,
  buttonSecondary: `${inter.className} inline-flex items-center justify-center border border-[#333333] bg-transparent px-3 py-1.5 text-xs font-medium leading-none text-white transition-colors hover:bg-[#1a1a1a] sm:px-3.5 sm:py-2 sm:text-sm`,
  buttonSecondaryLg: `${inter.className} inline-flex items-center justify-center border border-[#333333] bg-transparent px-5 py-2.5 text-sm font-medium leading-none text-white transition-colors hover:bg-[#1a1a1a] sm:px-6 sm:py-3 sm:text-base`,
  watermark: `${ppMondwest.className} pointer-events-none select-none text-[clamp(3rem,14vw,8.5rem)] leading-none text-[#1a1a1a]`,

  quote: `${inter.className} text-[0.9375rem] font-normal leading-[1.6] text-[var(--ca-ink-secondary)] sm:text-base sm:leading-[1.55]`,
  attribution: `${inter.className} text-sm font-medium text-[var(--ca-ink)]`,
  attributionMeta: `${inter.className} text-xs font-normal text-[var(--ca-muted)] sm:text-sm`,
  sectionTitle: `${inter.className} text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ca-muted)]`,

  onboardingTitle: `${ppMondwest.className} text-[clamp(1.75rem,3.5vw+0.5rem,2.75rem)] font-normal tracking-[-0.02em] leading-[1.12] text-white`,
  onboardingLead: `${inter.className} text-base leading-[1.65] text-[#8A8A8A] sm:text-lg sm:leading-[1.6]`,
} as const;
