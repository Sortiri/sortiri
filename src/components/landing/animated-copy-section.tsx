"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { LearnMoreButton } from "@/components/landing/learn-more-button";
import { landing } from "@/components/landing/typography";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const ACCENT_CLASS = "text-[#00E013]";

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

export type AnimatedCopyLine = {
  text: string;
  accent?: string;
};

type LandingAnimatedCopySectionProps = {
  kicker: string;
  lines: AnimatedCopyLine[];
  className?: string;
  inViewAmount?: number;
  followsDiagram?: boolean;
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

export function LandingAnimatedCopySection({
  kicker,
  lines,
  className = "",
  inViewAmount = 0.32,
  followsDiagram = false,
}: LandingAnimatedCopySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(sectionRef, {
    once: false,
    amount: inViewAmount,
    margin: "0px 0px -12% 0px",
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

  return (
    <section
      ref={sectionRef}
      className={`${followsDiagram ? landing.copyBlockPaired : landing.copyBlock} min-w-0 overflow-x-clip ${className}`}
    >
      <p className={`${landing.sectionKicker} ${landing.labelAccent}`}>
        {kicker}
      </p>

      <motion.div
        key={cycle}
        className="mx-auto flex w-full max-w-3xl flex-col gap-2"
        variants={cascadeVariants}
        initial="hidden"
        animate={motionState}
      >
        {lines.map((line) => {
          const tokens = tokenizeWithAccent(line.text, line.accent);
          return (
            <p key={line.text} className={landing.displayLine}>
              {tokens.map((token, index) => (
                <motion.span
                  key={`${token.word}-${index}`}
                  className={`inline${token.accent ? ` ${ACCENT_CLASS}` : ""}`}
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

      <div className="mx-auto mt-8 flex w-full max-w-3xl justify-center sm:mt-10">
        <LearnMoreButton />
      </div>
    </section>
  );
}
