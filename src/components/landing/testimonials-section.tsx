import { LearnMoreButton } from "@/components/landing/learn-more-button";
import { landing } from "@/components/landing/typography";

const testimonials = [
  {
    quote:
      "We finally have one searchable history for every agent action, product event, and company decision.",
    name: "Sarah Chen",
    handle: "Head of Ops, Series B SaaS",
    initials: "SC",
  },
  {
    quote:
      "Audit used to mean digging through Slack threads. Now we replay the timeline and know exactly what happened.",
    name: "Marcus Webb",
    handle: "Engineering lead, AI-native fintech",
    initials: "MW",
  },
  {
    quote:
      "Our board asks what changed in Q2. We open Sortiri and show them the full replay—not a slide deck.",
    name: "Elena Ruiz",
    handle: "CEO, agent platform",
    initials: "ER",
  },
];

export function LandingTestimonialsSection() {
  return (
    <section className={landing.section}>
      <p className={`${landing.sectionKicker} ${landing.labelAccent} mb-10 sm:mb-14`}>
        What AI-native orgs are saying
      </p>

      <div className="landing-testimonials__grid">
        {testimonials.map((item) => (
          <article key={item.name} className="landing-testimonials__card">
            <p className={landing.quote}>&ldquo;{item.quote}&rdquo;</p>

            <div className="mt-6 flex items-center gap-3 border-t border-[var(--ca-border)] pt-5">
              <div className="landing-testimonials__avatar" aria-hidden>
                {item.initials}
              </div>
              <div className="min-w-0">
                <p className={landing.attribution}>{item.name}</p>
                <p className={`${landing.attributionMeta} mt-0.5 truncate`}>
                  {item.handle}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 flex justify-center sm:mt-14">
        <LearnMoreButton />
      </div>
    </section>
  );
}
