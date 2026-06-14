"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useSignUp } from "@clerk/nextjs/legacy";
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
  POST_SIGN_UP_PATH,
  SIGN_IN_HREF,
} from "@/lib/auth-routes";
import { redirectAfterAuth } from "@/lib/auth-redirect";
import { getClerkErrorMessage } from "@/lib/clerk-error-message";

type SignUpStep = "credentials" | "verify";

export function PolarisSignUpForm() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded, signUp, setActive } = useSignUp();

  const [step, setStep] = useState<SignUpStep>("credentials");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      redirectAfterAuth(POST_SIGN_UP_PATH);
    }
  }, [authLoaded, isSignedIn]);

  const onCredentialsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded || !signUp) return;

    setSubmitting(true);
    setError(null);

    try {
      await signUp.create({
        emailAddress: email.trim(),
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded || !signUp) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        redirectAfterAuth(POST_SIGN_UP_PATH);
        return;
      }

      setError("Verification is incomplete. Check the code and try again.");
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoaded || !isLoaded) {
    return (
      <AuthCard title="Create your account" subtitle="Loading…">
        <Paragraph color="subdued">Preparing sign up…</Paragraph>
      </AuthCard>
    );
  }

  if (step === "verify") {
    return (
      <AuthCard
        title="Verify your email"
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
              Verify and continue
            </Button>

            <Button
              type="button"
              variant="secondary"
              inlineSize="fill"
              disabled={submitting}
              onClick={() => {
                setStep("credentials");
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
      title="Create your account"
      subtitle="Start recording your company's history."
    >
      <Stack direction="block" gap="small-200">
        {error ? (
          <Alert tone="critical" heading="Could not create account">
            {error}
          </Alert>
        ) : null}

        <AuthSocialButtons
          authenticateWithRedirect={signUp.authenticateWithRedirect}
          disabled={submitting}
        />

        <form onSubmit={onCredentialsSubmit} className="auth-card__form">
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

            <div id="clerk-captcha" />

            <Button type="submit" inlineSize="fill" loading={submitting}>
              Create free account
            </Button>

            <Paragraph color="subdued">
              Already have an account?{" "}
              <Link href={SIGN_IN_HREF}>Sign in</Link>
            </Paragraph>
          </Stack>
        </form>
      </Stack>
    </AuthCard>
  );
}
