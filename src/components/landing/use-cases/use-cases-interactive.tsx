"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { UseCaseDiagramPanel } from "@/components/landing/use-cases/use-case-diagram-panel";
import { UseCaseSelector } from "@/components/landing/use-cases/use-case-selector";
import {
  DEFAULT_USE_CASE_ID,
  type UseCaseId,
} from "@/components/landing/use-cases/use-cases";
import { landing } from "@/components/landing/typography";
import { inter } from "@/lib/inter";
import { ppMondwest } from "@/lib/landing-fonts";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const ACCENT_CLASS = "text-[#c490e8]";
const ACCENT_FONT_CLASS = ppMondwest.className;
const BASE_FONT_CLASS = inter.className;

const HEADLINE_LINES: Array<{ text: string; accent?: string }> = [
  {
    text: "The company timeline becomes useful everywhere agents touch work.",
    accent: "agents touch work",
  },
];

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

export function UseCasesInteractive() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(sectionRef, {
    once: false,
    amount: 0.2,
    margin: "0px 0px -10% 0px",
  });
  const [cycle, setCycle] = useState(0);
  const wasInViewRef = useRef(false);
  const [selectedId, setSelectedId] = useState<UseCaseId>(DEFAULT_USE_CASE_ID);

  useEffect(() => {
    if (reduceMotion) return;
    if (inView && !wasInViewRef.current) {
      setCycle((n) => n + 1);
    }
    wasInViewRef.current = inView;
  }, [inView, reduceMotion]);

  const show = reduceMotion === true || inView;
  const motionState = show ? "visible" : "hidden";

  return (
    <section
      ref={sectionRef}
      className={`use-cases ${landing.landingSection}`}
      aria-labelledby="use-cases-heading"
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
          USE CASES
        </motion.p>
      </motion.div>

      <motion.div
        key={`${cycle}-text`}
        id="use-cases-heading"
        className="mx-auto mb-8 flex w-full max-w-3xl flex-col gap-2 sm:mb-10"
        variants={cascadeVariants}
        initial="hidden"
        animate={motionState}
      >
        {HEADLINE_LINES.map((line) => {
          const tokens = tokenizeWithAccent(line.text, line.accent);
          return (
            <p
              key={line.text}
              className={`${BASE_FONT_CLASS} text-center text-[clamp(1.5rem,3vw+0.5rem,2.5rem)] font-normal leading-[1.12] text-white`}
            >
              {tokens.map((token, index) => (
                <motion.span
                  key={`${token.word}-${index}`}
                  className={`inline${
                    token.accent
                      ? ` ${ACCENT_CLASS} ${ACCENT_FONT_CLASS} text-[clamp(1.625rem,3.2vw+0.5rem,2.75rem)]`
                      : ""
                  }`}
                  variants={wordVariants}
                >
                  {token.word}
                  {index < tokens.length - 1 ? " " : ""}
                </motion.span>
              ))}
            </p>
          );
        })}
      </motion.div>

      <div className="use-cases__layout mx-auto w-full max-w-6xl">
        <UseCaseSelector selectedId={selectedId} onSelect={setSelectedId} />
        <UseCaseDiagramPanel useCaseId={selectedId} />
      </div>
    </section>
  );
}
