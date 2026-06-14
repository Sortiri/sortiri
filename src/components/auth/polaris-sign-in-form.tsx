"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useEffect, useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmailField } from "@/components/ui/email-field";
import { Input } from "@/components/ui/input";
import { Stack } from "@/components/ui/stack";
import { Paragraph } from "@/components/ui/text";
import {
  POST_SIGN_IN_PATH,
  SIGN_UP_HREF,
} from "@/lib/auth-routes";
import { redirectAfterAuth } from "@/lib/auth-redirect";
import { getClerkErrorMessage } from "@/lib/clerk-error-message";

type SignInStep = "sign-in" | "verify";

export function PolarisSignInForm() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [step, setStep] = useState<SignInStep>("sign-in");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      redirectAfterAuth(POST_SIGN_IN_PATH);
    }
  }, [authLoaded, isSignedIn]);

  const onSignInSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded || !signIn) return;

    setSubmitting(true);
    setError(null);

    try {
      await signIn.create({ identifier: email.trim() });

      const emailCodeFactor = signIn.supportedFirstFactors?.find(
        (factor) => factor.strategy === "email_code",
      );

      if (!emailCodeFactor || !("emailAddressId" in emailCodeFactor)) {
        setError(
          "Email sign-in is not available. Try another sign-in method.",
        );
        return;
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailCodeFactor.emailAddressId,
      });
      setStep("verify");
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded || !signIn) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: code.trim(),
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        redirectAfterAuth(POST_SIGN_IN_PATH);
        return;
      }

      setError("Could not verify the code. Check it and try again.");
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoaded || !isLoaded) {
    return (
      <AuthCard title="Sign in" subtitle="Loading…">
        <Paragraph color="subdued">Preparing sign in…</Paragraph>
      </AuthCard>
    );
  }

  if (step === "verify") {
    return (
      <AuthCard
        title="Check your email"
        subtitle={`Enter the code we sent to ${email.trim()}.`}
      >
        <form onSubmit={onVerifySubmit} className="auth-card__form">
          <Stack direction="block" gap="small-200">
            {error ? (
              <Alert tone="critical" heading="Verification failed">
                {error}
              </Alert>
            ) : null}

            <Input
              label="Verification code"
              name="code"
              value={code}
              autoComplete="one-time-code"
              required
              disabled={submitting}
              onChange={(event) => setCode(event.currentTarget.value)}
            />

            <Button type="submit" inlineSize="fill" loading={submitting}>
              Sign in
            </Button>

            <Button
              type="button"
              variant="secondary"
              inlineSize="fill"
              disabled={submitting}
              onClick={() => {
                setStep("sign-in");
                setCode("");
                setError(null);
              }}
            >
              Back
            </Button>
          </Stack>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to Sortiri Timeline."
    >
      <Stack direction="block" gap="small-200">
        {error ? (
          <Alert tone="critical" heading="Could not sign in">
            {error}
          </Alert>
        ) : null}

        <AuthSocialButtons
          authenticateWithRedirect={signIn.authenticateWithRedirect}
          disabled={submitting}
        />

        <form onSubmit={onSignInSubmit} className="auth-card__form">
          <Stack direction="block" gap="small-200">
            <EmailField
              label="Email"
              name="email"
              value={email}
              autoComplete="email"
              required
              disabled={submitting}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />

            <Button type="submit" inlineSize="fill" loading={submitting}>
              Continue with email
            </Button>

            <Paragraph color="subdued">
              New here?{" "}
              <Link href={SIGN_UP_HREF}>Create a free account</Link>
            </Paragraph>
          </Stack>
        </form>
      </Stack>
    </AuthCard>
  );
}
