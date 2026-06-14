"use client";

import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { PolarisSignUpForm } from "@/components/auth/polaris-sign-up-form";
import { Paragraph } from "@/components/ui/text";

export function PolarisSignUpFormShell() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Create your account" subtitle="Loading…">
          <Paragraph color="subdued">Preparing sign up…</Paragraph>
        </AuthCard>
      }
    >
      <PolarisSignUpForm />
    </Suspense>
  );
}
