import { OnboardingPageClient } from "@/components/onboarding/onboarding-page-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding — Sortiri Timeline",
  description: "Set up your company timeline.",
};

export default function OnboardingPage() {
  return <OnboardingPageClient />;
}
