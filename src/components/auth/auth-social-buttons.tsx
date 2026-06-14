"use client";

import type { OAuthStrategy } from "@clerk/shared/types";
import { useState } from "react";
import { GoogleLogoIcon } from "@/components/auth/google-logo-icon";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Stack } from "@/components/ui/stack";
import { getClerkErrorMessage } from "@/lib/clerk-error-message";
import {
  getOAuthRedirectUrls,
  useClerkOAuthProviders,
} from "@/lib/clerk-oauth-providers";

function OAuthButtonLabel({
  strategy,
  name,
}: {
  strategy: OAuthStrategy;
  name: string;
}) {
  if (strategy === "oauth_google") {
    return (
      <span className="auth-oauth-button__label">
        <GoogleLogoIcon className="auth-oauth-button__icon" />
        Continue with Google
      </span>
    );
  }

  return <>Continue with {name}</>;
}

type AuthSocialButtonsProps = {
  authenticateWithRedirect: (params: {
    strategy: OAuthStrategy;
    redirectUrl: string;
    redirectUrlComplete: string;
  }) => Promise<void>;
  disabled?: boolean;
};

export function AuthSocialButtons({
  authenticateWithRedirect,
  disabled = false,
}: AuthSocialButtonsProps) {
  const providers = useClerkOAuthProviders();
  const [error, setError] = useState<string | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState<OAuthStrategy | null>(
    null,
  );

  if (providers.length === 0) {
    return null;
  }

  const onProviderClick = async (strategy: OAuthStrategy) => {
    setError(null);
    setLoadingStrategy(strategy);

    try {
      const { redirectUrl, redirectUrlComplete } = getOAuthRedirectUrls();
      await authenticateWithRedirect({
        strategy,
        redirectUrl,
        redirectUrlComplete,
      });
    } catch (err) {
      setError(getClerkErrorMessage(err));
      setLoadingStrategy(null);
    }
  };

  return (
    <Stack direction="block" gap="small-200">
      {error ? (
        <Alert tone="critical" heading="Could not continue">
          {error}
        </Alert>
      ) : null}

      <Stack direction="block" gap="small-200">
        {providers.map((provider) => (
          <Button
            key={provider.strategy}
            type="button"
            variant="secondary"
            inlineSize="fill"
            disabled={disabled || loadingStrategy !== null}
            loading={loadingStrategy === provider.strategy}
            onClick={() => onProviderClick(provider.strategy)}
          >
            <OAuthButtonLabel
              strategy={provider.strategy}
              name={provider.name}
            />
          </Button>
        ))}
      </Stack>

      <div className="auth-form-divider" role="separator">
        <span>or</span>
      </div>
    </Stack>
  );
}
