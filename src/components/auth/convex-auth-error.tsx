"use client";

import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";

export function ConvexAuthError() {
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();

  if (!clerkLoaded || convexAuthLoading || !isSignedIn || isAuthenticated) {
    return null;
  }

  return (
    <div className="convex-auth-error">
      <strong>Could not connect your session to Convex.</strong>
      <p>
        In the Clerk dashboard, open <strong>Configure → Integrations</strong>{" "}
        and activate the <strong>Convex</strong> integration for this app. Then
        confirm <code>CLERK_JWT_ISSUER_DOMAIN</code> is set on your Convex
        deployment and run <code>npx convex dev</code> once to sync auth config.
      </p>
      <p>After that, refresh this page.</p>
    </div>
  );
}
