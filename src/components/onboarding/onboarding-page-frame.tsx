"use client";

import type { ReactNode } from "react";
import { inter } from "@/lib/inter";
import { ppMondwest } from "@/lib/landing-fonts";
import "./onboarding-page.css";

type OnboardingPageFrameProps = {
  children: ReactNode;
};

export function OnboardingPageFrame({ children }: OnboardingPageFrameProps) {
  return (
    <div
      className={`onboarding-page ${ppMondwest.variable} ${inter.className} min-h-dvh antialiased`}
    >
      <div className="mx-auto flex h-[calc(100dvh)] max-h-[calc(100dvh)] min-h-0 w-full max-w-5xl flex-col px-6 pb-12 sm:px-8">
        {children}
      </div>
    </div>
  );
}
