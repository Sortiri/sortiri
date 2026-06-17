"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { HighlightCardItem } from "@/components/landing/highlights/highlight-card";
import { HIGHLIGHT_CARDS } from "@/components/landing/highlights/highlights";
import { landing } from "@/components/landing/typography";
import { inter } from "@/lib/inter";
import { ppMondwest } from "@/lib/landing-fonts";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const ACCENT_CLASS = "text-[#c490e8]";
const ACCENT_FONT_CLASS = ppMondwest.className;
const BASE_FONT_CLASS = inter.className;

const HEADLINE = {
  text: "Built for companies running agents in production.",
  accent: "agents in production",
};

const cascadeVariants: Variants = {
  hidden: {
    opacity: 1,
    transition: { staggerChildren: 0, delayChildren: 0 },
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.042,
      delayChildren: 0.18,
    },
  },
};

const wordVariants: Variants = {
  hidden: { opacity: 0, y: "0.2em" },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_OUT },
  },
};

function stripTrailingPunctuation(word: string) {
  return word.replace(/[.,!?;:]+$/, "");
}

function tokenizeWithAccent(
  line: string,
  accentPhrase?: string,
): Array<{ word: string; accent: boolean }> {
  const words = line.match(/\S+/g) ?? [];
  if (!accentPhrase) {
    return words.map((word) => ({ word, accent: false }));
  }

  const accentWords = accentPhrase.split(/\s+/).filter(Boolean);
  const result: Array<{ word: string; accent: boolean }> = [];

  for (let i = 0; i < words.length; i++) {
    if (i + accentWords.length <= words.length) {
      const slice = words
        .slice(i, i + accentWords.length)
        .map(stripTrailingPunctuation);
      if (slice.join(" ") === accentPhrase) {
        for (let j = 0; j < accentWords.length; j++) {
          result.push({ word: words[i + j], accent: true });
        }
        i += accentWords.length - 1;
        continue;
      }
    }
    result.push({ word: words[i], accent: false });
  }

  return result;
}

export function HighlightsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(sectionRef, {
    once: false,
    amount: 0.15,
    margin: "0px 0px -10% 0px",
  });
  const [cycle, setCycle] = useState(0);
  const wasInViewRef = useRef(false);

  useEffect(() => {
    if (reduceMotion) return;
    if (inView && !wasInViewRef.current) {
      setCycle((n) => n + 1);
    }
    wasInViewRef.current = inView;
  }, [inView, reduceMotion]);

  const show = reduceMotion === true || inView;
  const motionState = show ? "visible" : "hidden";
  const tokens = tokenizeWithAccent(HEADLINE.text, HEADLINE.accent);

  return (
    <section
      ref={sectionRef}
      className={`highlights ${landing.landingSection}`}
      aria-labelledby="highlights-heading"
    >
      <motion.div
        key={cycle}
        className="mx-auto flex w-full max-w-3xl flex-col gap-2"
        variants={cascadeVariants}
        initial="hidden"
        animate={motionState}
      >
        <motion.p
          className={`${landing.sectionKicker} ${landing.labelAccent}`}
          variants={wordVariants}
        >
          HIGHLIGHTS
        </motion.p>
      </motion.div>

      <motion.div
        key={`${cycle}-headline`}
        id="highlights-heading"
        className="mx-auto mb-8 flex w-full max-w-3xl flex-col gap-2 sm:mb-10"
        variants={cascadeVariants}
        initial="hidden"
        animate={motionState}
      >
        <p
          className={`${BASE_FONT_CLASS} text-center ${landing.sectionHeadline}`}
        >
          {tokens.map((token, index) => (
            <motion.span
              key={`${token.word}-${index}`}
              className={`inline${
                token.accent
                  ? ` ${ACCENT_CLASS} ${ACCENT_FONT_CLASS} ${landing.sectionHeadlineAccent}`
                  : ""
              }`}
              variants={wordVariants}
            >
              {token.word}
              {index < tokens.length - 1 ? " " : ""}
            </motion.span>
          ))}
        </p>
      </motion.div>

      <div className="highlights__grid mx-auto w-full max-w-6xl">
        {HIGHLIGHT_CARDS.map((card) => (
          <HighlightCardItem key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
