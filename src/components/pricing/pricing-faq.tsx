import { PRICING_FAQ_ITEMS } from "@/config/pricing-faq";
import { landing } from "@/components/landing/typography";
import { inter } from "@/lib/inter";

export function PricingFaq() {
  return (
    <section className="pricing-faq" aria-labelledby="pricing-faq-title">
      <h2 id="pricing-faq-title" className={`${landing.displayLine} pricing-faq__title`}>
        FAQ
      </h2>

      <dl className="pricing-faq__list">
        {PRICING_FAQ_ITEMS.map((item) => (
          <div key={item.question} className="pricing-faq__item">
            <dt className="pricing-faq__question">{item.question}</dt>
            <dd className={`${inter.className} pricing-faq__answer`}>{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
