"use client";

import type { ReactNode } from "react";
import { inter } from "@/lib/inter";
import { ppMondwest } from "@/lib/landing-fonts";
import { AuthLegalFooter } from "@/components/auth/auth-legal-footer";
import "./auth-page.css";

type AuthPageShellProps = {
  children: ReactNode;
  legal: "sign-in" | "sign-up";
};

export function AuthPageShell({ children, legal }: AuthPageShellProps) {
  return (
    <div
      className={`auth-page-root ${ppMondwest.variable} ${inter.className} antialiased`}
    >
      <main className="auth-page">
        <div className="auth-page__main">
          <div className="auth-page__content">{children}</div>
        </div>
        <AuthLegalFooter variant={legal} />
      </main>
    </div>
  );
}
