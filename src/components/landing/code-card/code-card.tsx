"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { CodeLine } from "@/components/landing/code-card/code-line";
import { CodeTabs } from "@/components/landing/code-card/code-tabs";
import { CopyButton } from "@/components/landing/code-card/copy-button";
import type { CodeLanguage } from "@/components/landing/code-card/highlight";

export type CodeCardTab = {
  id: string;
  label: string;
  code: string;
  language: CodeLanguage;
};

type CodeCardProps = {
  tabs: readonly CodeCardTab[];
  defaultTabId: string;
  size?: "hero" | "compact";
  className?: string;
};

export function CodeCard({
  tabs,
  defaultTabId,
  size = "hero",
  className = "",
}: CodeCardProps) {
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = useState(defaultTabId);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeId) ?? tabs[0],
    [activeId, tabs],
  );

  const lines = activeTab.code.split("\n");

  return (
    <div
      className={`code-card code-card--${size} ${className}`.trim()}
      data-size={size}
    >
      <div className="code-card__header">
        <CodeTabs
          tabs={tabs}
          activeId={activeTab.id}
          onChange={setActiveId}
          compact={size === "compact"}
        />
        <CopyButton text={activeTab.code} compact={size === "compact"} />
      </div>

      <div className="code-card__body">
        <AnimatePresence mode="wait" initial={false}>
          <motion.pre
            key={activeTab.id}
            id={`code-panel-${activeTab.id}`}
            role="tabpanel"
            aria-labelledby={`code-tab-${activeTab.id}`}
            className="code-card__pre"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <code className="code-card__code">
              {lines.map((line, index) => (
                <CodeLine key={`${activeTab.id}-${index}`} line={line} language={activeTab.language} />
              ))}
            </code>
          </motion.pre>
        </AnimatePresence>
      </div>
    </div>
  );
}
