export const ONBOARDING_STEP_COUNT = 6;

export const ONBOARDING_STEP_LABELS = [
  "Company",
  "Type",
  "Track",
  "Tools",
  "Ask",
  "Create",
] as const;

export const COMPANY_TYPES = [
  "AI Startup",
  "SaaS",
  "Agency",
  "Internal AI Team",
  "Enterprise",
] as const;

export const TRACK_TYPES = [
  "Agent Actions",
  "Product Events",
  "Code Changes",
  "Team Decisions",
  "Revenue Events",
] as const;

export const ONBOARDING_TOOLS = [
  "Cursor",
  "Claude Code",
  "Codex",
  "GitHub",
  "PostHog",
  "Stripe",
  "Linear",
  "Slack",
] as const;

export const EXAMPLE_QUESTIONS = [
  "Why did revenue drop?",
  "What did the agent do yesterday?",
  "Why did this feature ship?",
  "What changed before churn increased?",
] as const;

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

export function isOnboardingComplete(profile: OnboardingProfile | null | undefined) {
  return Boolean(profile?.completedAt);
}
