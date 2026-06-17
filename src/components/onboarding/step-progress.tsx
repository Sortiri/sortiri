"use client";

import { departureMono } from "@/lib/landing-fonts";
import {
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEP_LABELS,
} from "@/lib/onboarding/types";

type StepProgressProps = {
  current: number;
};

export function StepProgress({ current }: StepProgressProps) {
  const steps = ONBOARDING_STEP_LABELS.slice(0, ONBOARDING_STEP_COUNT);

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {steps.map((label, index) => {
        const isActive = index === current;
        const isComplete = index < current;

        return (
          <div key={label} className="flex items-center gap-2 sm:gap-3">
            <span
              className={`${departureMono.className} px-1.5 py-0.5 text-[0.625rem] font-normal tracking-[0.12em] uppercase sm:text-[0.6875rem] ${
                isActive
                  ? "bg-[var(--ca-brand)] text-white"
                  : isComplete
                    ? "bg-[var(--ca-surface-2)] text-white"
                    : "bg-[var(--ca-surface-1)] text-[var(--ca-muted)]"
              }`}
            >
              {label}
            </span>
            {index < steps.length - 1 ? (
              <span className="text-[0.625rem] text-[var(--ca-border)] sm:text-[0.6875rem]">
                →
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
