"use client";

import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { ConvexAuthError } from "@/components/auth/convex-auth-error";
import { DashboardContentLoader } from "@/components/dashboard-content-loader";
import { POST_SIGN_UP_PATH } from "@/lib/auth-routes";
import { useAppAuth } from "@/hooks/use-app-auth";
import { isOnboardingComplete } from "@/lib/onboarding/types";

type OnboardingGuardProps = {
  children: React.ReactNode;
};

function GuardUnauthenticated() {
  const router = useRouter();
  const { isSignedOut, convexAuthFailed } = useAppAuth();

  useEffect(() => {
    if (isSignedOut) {
      router.replace("/");
    }
  }, [isSignedOut, router]);

  if (convexAuthFailed) {
    return <ConvexAuthError />;
  }

  return <DashboardContentLoader />;
}

function GuardCheckOnboarding({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const profile = useQuery(api.onboarding.getProfile);

  useEffect(() => {
    if (profile === undefined) return;
    if (!isOnboardingComplete(profile)) {
      router.replace(POST_SIGN_UP_PATH);
    }
  }, [profile, router]);

  if (profile === undefined || !isOnboardingComplete(profile)) {
    return <DashboardContentLoader />;
  }

  return children;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  return (
    <>
      <AuthLoading>
        <DashboardContentLoader />
      </AuthLoading>
      <Unauthenticated>
        <GuardUnauthenticated />
      </Unauthenticated>
      <Authenticated>
        <GuardCheckOnboarding>{children}</GuardCheckOnboarding>
      </Authenticated>
    </>
  );
}
