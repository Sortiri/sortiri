"use client";

import Link from "next/link";
import { landing } from "@/components/landing/typography";
import { StepProgress } from "@/components/onboarding/step-progress";
import { inter } from "@/lib/inter";

type OnboardingShellProps = {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function OnboardingShell({
  step,
  title,
  description,
  children,
}: OnboardingShellProps) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col py-8 sm:py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center" aria-label="Sortiri home">
          <img
            src="/sortiri-mark.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7"
          />
        </Link>
        <span className={`${inter.className} text-sm text-[var(--ca-muted)]`}>
          Onboarding
        </span>
      </div>

      <StepProgress current={step} />

      <div className="mt-10 space-y-4 sm:mt-12">
        <h1 className={landing.onboardingTitle}>{title}</h1>
        {description ? (
          <p className={landing.onboardingLead}>{description}</p>
        ) : null}
      </div>

      <div className="mt-10 flex min-h-0 flex-1 flex-col sm:mt-12">{children}</div>
    </div>
  );
}

export function OnboardingActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-[var(--ca-border)] pt-10 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${landing.buttonPrimary} w-full disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[12rem]`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${landing.buttonSecondaryLg} w-full disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto`}
    >
      {children}
    </button>
  );
}
