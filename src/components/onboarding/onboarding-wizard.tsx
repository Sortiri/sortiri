"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChoiceGrid,
  MultiChoiceGrid,
} from "@/components/onboarding/choice-grid";
import { OnboardingPageFrame } from "@/components/onboarding/onboarding-page-frame";
import { useOnboardingMutations } from "@/components/onboarding/onboarding-page-client";
import {
  OnboardingActions,
  OnboardingShell,
  PrimaryButton,
  SecondaryButton,
} from "@/components/onboarding/onboarding-shell";
import { useAppAuth } from "@/hooks/use-app-auth";
import { redirectAfterAuth } from "@/lib/auth-redirect";
import { POST_SIGN_IN_PATH } from "@/lib/auth-routes";
import {
  buildTimelineName,
  COMPANY_TYPES,
  EXAMPLE_QUESTIONS,
  isOnboardingComplete,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_TOOLS,
  TRACK_TYPES,
  type OnboardingProfile,
} from "@/lib/onboarding/types";

type OnboardingWizardProps = {
  profile: OnboardingProfile | null;
};

type WizardState = {
  companyName: string;
  companyType: string | null;
  trackTypes: string[];
  tools: string[];
  exampleQuestion: string | null;
  currentStep: number;
};

function stateFromProfile(profile: OnboardingProfile | null): WizardState {
  return {
    companyName: profile?.companyName ?? "",
    companyType: profile?.companyType ?? null,
    trackTypes:
      profile?.trackTypes && profile.trackTypes.length > 0
        ? profile.trackTypes
        : [...TRACK_TYPES],
    tools: profile?.tools ?? [],
    exampleQuestion: profile?.exampleQuestion ?? null,
    currentStep: Math.min(profile?.currentStep ?? 0, ONBOARDING_STEP_COUNT - 1),
  };
}

const STEP_META: { title: string; description?: string }[] = [
  {
    title: "What's your company called?",
    description: "We'll use this to name your timeline workspace.",
  },
  {
    title: "What best describes your company?",
    description: "This personalizes examples later.",
  },
  {
    title: "What do you want to track?",
    description: "Select everything you want in your company timeline.",
  },
  {
    title: "Which tools do you use?",
    description: "Select all that apply.",
  },
  {
    title: "What would you like to ask?",
    description: "Pick an example to imagine the future value.",
  },
  {
    title: "Create timeline",
    description: "We'll set up your workspace.",
  },
];

export function OnboardingWizard({ profile }: OnboardingWizardProps) {
  const router = useRouter();
  const { isReady, convexAuthFailed } = useAppAuth();
  const { saveProfile, complete } = useOnboardingMutations();
  const [state, setState] = useState<WizardState>(() => stateFromProfile(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stepScrollRef = useRef<HTMLDivElement>(null);
  const finishStarted = useRef(false);

  useEffect(() => {
    stepScrollRef.current?.scrollTo({ top: 0, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
  }, [state.currentStep]);

  const saveProgress = useCallback(
    async (nextStep: number, patch: Partial<WizardState> = {}) => {
      setSaving(true);
      setError(null);

      const merged = { ...state, ...patch, currentStep: nextStep };
      const companyName = merged.companyName.trim();

      try {
        await saveProfile({
          patch: {
            companyName,
            timelineName: buildTimelineName(companyName),
            companyType: merged.companyType,
            trackTypes: merged.trackTypes,
            tools: merged.tools,
            exampleQuestion: merged.exampleQuestion,
            currentStep: nextStep,
          },
        });
        setState(merged);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save progress");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [saveProfile, state],
  );

  const handleFinish = useCallback(async () => {
    if (!isReady || convexAuthFailed) return;
    if (finishStarted.current) return;
    finishStarted.current = true;
    setSaving(true);
    setError(null);

    try {
      const saved = await saveProgress(state.currentStep);
      if (!saved) {
        finishStarted.current = false;
        return;
      }

      await complete({});
      redirectAfterAuth(POST_SIGN_IN_PATH);
    } catch (err) {
      finishStarted.current = false;
      setError(err instanceof Error ? err.message : "Could not finish onboarding");
    } finally {
      setSaving(false);
    }
  }, [complete, convexAuthFailed, isReady, saveProgress, state.currentStep]);

  useEffect(() => {
    if (!profile || !isOnboardingComplete(profile)) return;
    redirectAfterAuth(POST_SIGN_IN_PATH);
  }, [profile]);

  useEffect(() => {
    if (state.currentStep !== ONBOARDING_STEP_COUNT - 1 || !isReady) return;
    void handleFinish();
  }, [handleFinish, isReady, state.currentStep]);

  async function handleContinue(patch: Partial<WizardState> = {}) {
    const merged = { ...state, ...patch };
    const validationError = validateStep(merged);
    if (validationError) {
      setError(validationError);
      return;
    }

    const nextStep = Math.min(state.currentStep + 1, ONBOARDING_STEP_COUNT - 1);
    await saveProgress(nextStep, patch);
  }

  async function handleBack() {
    setError(null);
    const prevStep = Math.max(state.currentStep - 1, 0);
    setState((current) => ({ ...current, currentStep: prevStep }));
    await saveProgress(prevStep);
  }

  const meta = STEP_META[state.currentStep] ?? STEP_META[0];
  const isCreateStep = state.currentStep === ONBOARDING_STEP_COUNT - 1;
  const timelinePreview = buildTimelineName(state.companyName.trim() || "Acme AI");

  return (
    <OnboardingPageFrame>
      <div className="flex min-h-0 flex-1 flex-col">
        <OnboardingShell
          step={state.currentStep}
          title={meta.title}
          description={isCreateStep ? undefined : meta.description}
        >
          <div className="flex min-h-0 flex-1 flex-col" aria-live="polite">
            <div
              ref={stepScrollRef}
              className="min-h-0 flex-1 space-y-6 overflow-y-auto"
            >
              {state.currentStep === 0 ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="onboarding-company" className="onboarding-field-label">
                      Company name
                    </label>
                    <input
                      id="onboarding-company"
                      className="onboarding-input"
                      value={state.companyName}
                      placeholder="Acme AI"
                      disabled={saving}
                      onChange={(event) => {
                        const companyName = event.target.value;
                        setState((current) => ({
                          ...current,
                          companyName,
                        }));
                      }}
                    />
                  </div>
                  <div className="onboarding-example">
                    <p className="onboarding-example__label">Creates</p>
                    <p className="onboarding-example__value">{timelinePreview}</p>
                  </div>
                </div>
              ) : null}

              {state.currentStep === 1 ? (
                <ChoiceGrid
                  options={COMPANY_TYPES}
                  value={state.companyType}
                  onChange={(companyType) =>
                    setState((current) => ({ ...current, companyType }))
                  }
                  disabled={saving}
                />
              ) : null}

              {state.currentStep === 2 ? (
                <MultiChoiceGrid
                  options={TRACK_TYPES}
                  values={state.trackTypes}
                  onChange={(trackTypes) =>
                    setState((current) => ({ ...current, trackTypes }))
                  }
                  disabled={saving}
                />
              ) : null}

              {state.currentStep === 3 ? (
                <MultiChoiceGrid
                  options={ONBOARDING_TOOLS}
                  values={state.tools}
                  onChange={(tools) => setState((current) => ({ ...current, tools }))}
                  disabled={saving}
                />
              ) : null}

              {state.currentStep === 4 ? (
                <ChoiceGrid
                  options={EXAMPLE_QUESTIONS}
                  value={state.exampleQuestion}
                  onChange={(exampleQuestion) =>
                    setState((current) => ({ ...current, exampleQuestion }))
                  }
                  disabled={saving}
                />
              ) : null}

              {state.currentStep === 5 ? (
                <div className="onboarding-create">
                  {convexAuthFailed ? (
                    <p className="onboarding-error">
                      Session could not connect to the workspace backend. Refresh the
                      page and try again.
                    </p>
                  ) : (
                    <>
                      <div className="onboarding-spinner" aria-hidden />
                      <p className="onboarding-create__message">
                        Building your company timeline...
                      </p>
                    </>
                  )}
                </div>
              ) : null}

              {error ? <p className="onboarding-error">{error}</p> : null}
            </div>

            {!isCreateStep ? (
              <OnboardingActions>
                {state.currentStep > 0 ? (
                  <SecondaryButton onClick={handleBack} disabled={saving}>
                    Back
                  </SecondaryButton>
                ) : (
                  <SecondaryButton onClick={() => router.push("/")} disabled={saving}>
                    Back
                  </SecondaryButton>
                )}

                <PrimaryButton
                  disabled={saving || !isReady}
                  onClick={() => handleContinue()}
                >
                  {saving
                    ? "Saving…"
                    : state.currentStep === 4
                      ? "Create timeline"
                      : "Continue"}
                </PrimaryButton>
              </OnboardingActions>
            ) : null}
          </div>
        </OnboardingShell>
      </div>
    </OnboardingPageFrame>
  );
}

function validateStep(state: WizardState): string | null {
  switch (state.currentStep) {
    case 0:
      return state.companyName.trim() ? null : "Please enter your company name.";
    case 1:
      return state.companyType ? null : "Please select a company type.";
    case 2:
      return state.trackTypes.length > 0
        ? null
        : "Select at least one item to track.";
    case 3:
      return state.tools.length > 0 ? null : "Select at least one tool.";
    case 4:
      return state.exampleQuestion ? null : "Please select an example question.";
    default:
      return null;
  }
}
