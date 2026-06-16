"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export function useDiagramCycle(intervalMs: number, enabled = true) {
  const reduceMotion = useReducedMotion();
  const staticMode = reduceMotion === true;
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (staticMode || !enabled) return;

    const id = window.setInterval(() => {
      setCycle((value) => value + 1);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [staticMode, enabled, intervalMs]);

  return { cycle, staticMode };
}
