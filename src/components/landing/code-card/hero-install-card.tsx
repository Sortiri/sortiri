"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { CodeLine } from "@/components/landing/code-card/code-line";
import { CopyButton } from "@/components/landing/code-card/copy-button";
import type { CodeLanguage } from "@/components/landing/code-card/highlight";

export type CodeCardTab = {
  id: string;
  label: string;
  code: string;
  language: CodeLanguage;
};

type HeroInstallCardProps = {
  tabs: readonly CodeCardTab[];
  defaultTabId: string;
};

export function HeroInstallCard({
  tabs,
  defaultTabId,
}: HeroInstallCardProps) {
  const reduceMotion = useReducedMotion();
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === defaultTabId) ?? tabs[0],
    [defaultTabId, tabs],
  );

  const lines = activeTab.code.split("\n");
  const linesWithPrefix = lines.map((line) => `$ ${line}`);

  return (
    <div className="code-card code-card--compact hero-install-card">
      <div className="code-card__body hero-install-card__body">
        <motion.pre
          key={activeTab.id}
          role="tabpanel"
          className="code-card__pre hero-install-card__pre"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <code className="code-card__code hero-install-card__code">
            {linesWithPrefix.map((line, index) => (
              <CodeLine
                key={`${activeTab.id}-${index}`}
                line={line}
                language={activeTab.language}
              />
            ))}
          </code>
        </motion.pre>
        <CopyButton text={activeTab.code} icon />
      </div>
    </div>
  );
}
