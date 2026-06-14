"use client";

import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";

export function useAppAuth() {
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();

  const isLoading = !clerkLoaded || convexAuthLoading;
  const isReady = clerkLoaded && Boolean(isSignedIn) && isAuthenticated;
  const isSignedOut = clerkLoaded && !isSignedIn;
  const convexAuthFailed =
    clerkLoaded && Boolean(isSignedIn) && !convexAuthLoading && !isAuthenticated;

  return {
    clerkLoaded,
    isSignedIn: Boolean(isSignedIn),
    isAuthenticated,
    isLoading,
    isReady,
    isSignedOut,
    convexAuthFailed,
  };
}
