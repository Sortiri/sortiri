"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { WorkspaceMembershipCapabilities } from "@/types/workspace-members";

export function useWorkspaceMembership(workspaceId: string | null) {
  const capabilities = useQuery(
    api.workspaceMembers.getCurrentMembership,
    workspaceId ? { workspaceId } : "skip",
  );

  return {
    loading: workspaceId !== null && capabilities === undefined,
    capabilities: (capabilities ?? null) as WorkspaceMembershipCapabilities | null,
  };
}
