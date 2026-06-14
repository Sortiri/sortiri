"use client";

import { useClerk } from "@clerk/nextjs";
import { getOAuthProviderData } from "@clerk/shared/oauth";
import type { LoadedClerk, OAuthStrategy } from "@clerk/shared/types";
import { useMemo } from "react";
import { POST_SIGN_UP_PATH } from "@/lib/auth-routes";

export type ClerkOAuthProvider = {
  strategy: OAuthStrategy;
  name: string;
};

type ClerkWithEnvironment = LoadedClerk & {
  __internal_environment?: {
    userSettings?: {
      authenticatableSocialStrategies?: OAuthStrategy[];
    };
  };
};

export function useClerkOAuthProviders(): ClerkOAuthProvider[] {
  const clerk = useClerk() as ClerkWithEnvironment;

  return useMemo(() => {
    if (!clerk.loaded) return [];

    const strategies =
      clerk.__internal_environment?.userSettings
        ?.authenticatableSocialStrategies ?? [];

    return strategies
      .map((strategy: OAuthStrategy) => {
        const data = getOAuthProviderData({ strategy });
        if (!data) return null;
        return { strategy: data.strategy, name: data.name };
      })
      .filter((provider): provider is ClerkOAuthProvider => provider !== null);
  }, [clerk]);
}

export function getOAuthRedirectUrls() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    redirectUrl: `${origin}/sso-callback`,
    redirectUrlComplete: `${origin}${POST_SIGN_UP_PATH}`,
  };
}
