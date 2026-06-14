import type { Doc } from "../_generated/dataModel";

export type OnboardingProfile = {
  userId: string;
  companyName: string;
  timelineName: string;
  companyType: string | null;
  trackTypes: string[];
  tools: string[];
  exampleQuestion: string | null;
  currentStep: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function buildTimelineName(companyName: string) {
  const trimmed = companyName.trim();
  if (!trimmed) return "My Timeline";
  return trimmed.endsWith(" Timeline") ? trimmed : `${trimmed} Timeline`;
}

export function docToProfile(doc: Doc<"onboardingProfiles">): OnboardingProfile {
  return {
    userId: doc.userId,
    companyName: doc.companyName,
    timelineName: doc.timelineName,
    companyType: doc.companyType ?? null,
    trackTypes: doc.trackTypes,
    tools: doc.tools,
    exampleQuestion: doc.exampleQuestion ?? null,
    currentStep: doc.currentStep,
    completedAt: doc.completedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
