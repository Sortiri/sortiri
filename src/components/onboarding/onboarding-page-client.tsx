"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";
import { ConvexAuthError } from "@/components/auth/convex-auth-error";
import { OnboardingPageFrame } from "@/components/onboarding/onboarding-page-frame";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useAppAuth } from "@/hooks/use-app-auth";
import { redirectAfterAuth } from "@/lib/auth-redirect";
import { POST_SIGN_IN_PATH } from "@/lib/auth-routes";
import { isOnboardingComplete } from "@/lib/onboarding/types";

function OnboardingLoading() {
  return (
    <OnboardingPageFrame>
      <p className="py-20 text-center text-[var(--ca-muted)]">Loading…</p>
    </OnboardingPageFrame>
  );
}

export function OnboardingPageClient() {
  const router = useRouter();
  const { isLoading, isReady, isSignedOut, convexAuthFailed } = useAppAuth();
  const profile = useQuery(api.onboarding.getProfile, isReady ? {} : "skip");
  const bootstrapWorkspace = useMutation(api.workspaces.bootstrap);
  const didBootstrap = useRef(false);

  useEffect(() => {
    if (!isReady || didBootstrap.current) return;
    didBootstrap.current = true;
    void bootstrapWorkspace({}).catch(() => undefined);
  }, [isReady, bootstrapWorkspace]);

  useEffect(() => {
    if (!isReady || profile === undefined) return;
    if (isOnboardingComplete(profile)) {
      redirectAfterAuth(POST_SIGN_IN_PATH);
    }
  }, [isReady, profile]);

  useEffect(() => {
    if (isSignedOut) {
      router.replace("/");
    }
  }, [isSignedOut, router]);

  if (isLoading || isSignedOut) {
    return <OnboardingLoading />;
  }

  if (convexAuthFailed) {
    return (
      <OnboardingPageFrame>
        <ConvexAuthError />
      </OnboardingPageFrame>
    );
  }

  if (!isReady || profile === undefined) {
    return <OnboardingLoading />;
  }

  return <OnboardingWizard profile={profile} />;
}

export function useOnboardingMutations() {
  const saveProfileMutation = useMutation(api.onboarding.upsert);
  const completeMutation = useMutation(api.onboarding.complete);

  return {
    saveProfile: saveProfileMutation,
    complete: completeMutation,
  };
}
