"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "../../../convex/_generated/api";
import type { Workspace, WorkspaceState } from "@/lib/workspace/types";

type WorkspaceContextValue = {
  loading: boolean;
  error: string | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string | null;
  createWorkspace: (name: string) => Promise<void>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function resolveActiveWorkspaceId(state: WorkspaceState | null | undefined): string | null {
  if (!state || state.workspaces.length === 0) {
    return null;
  }
  if (
    state.activeWorkspaceId &&
    state.workspaces.some((workspace) => workspace.id === state.activeWorkspaceId)
  ) {
    return state.activeWorkspaceId;
  }
  return state.workspaces[0]?.id ?? null;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();
  const remoteState = useQuery(
    api.workspaces.getState,
    isAuthenticated ? {} : "skip",
  );
  const bootstrapMutation = useMutation(api.workspaces.bootstrap);
  const createMutation = useMutation(api.workspaces.create);
  const updateMutation = useMutation(api.workspaces.update);
  const removeMutation = useMutation(api.workspaces.remove);
  const setActiveMutation = useMutation(api.workspaces.setActive);

  const [error, setError] = useState<string | null>(null);
  const bootstrapRequested = useRef(false);

  const loading =
    convexAuthLoading || (isAuthenticated && remoteState === undefined);

  const workspaces = isAuthenticated ? (remoteState?.workspaces ?? []) : [];
  const activeWorkspaceId = isAuthenticated
    ? resolveActiveWorkspaceId(remoteState)
    : null;

  useEffect(() => {
    if (!isAuthenticated) {
      bootstrapRequested.current = false;
      return;
    }
    if (remoteState === undefined || remoteState.workspaces.length > 0) {
      return;
    }
    if (bootstrapRequested.current) {
      return;
    }
    bootstrapRequested.current = true;
    void bootstrapMutation({}).catch((err) => {
      bootstrapRequested.current = false;
      setError(err instanceof Error ? err.message : "Could not load workspaces");
    });
  }, [bootstrapMutation, isAuthenticated, remoteState]);

  const createWorkspace = useCallback(
    async (name: string) => {
      setError(null);
      try {
        await createMutation({ name });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create workspace");
        throw err;
      }
    },
    [createMutation],
  );

  const renameWorkspace = useCallback(
    async (workspaceId: string, name: string) => {
      setError(null);
      try {
        await updateMutation({ workspaceId, name });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not rename workspace");
        throw err;
      }
    },
    [updateMutation],
  );

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      setError(null);
      try {
        await removeMutation({ workspaceId });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete workspace");
        throw err;
      }
    },
    [removeMutation],
  );

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      setError(null);
      try {
        await setActiveMutation({ workspaceId });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not switch workspace");
        throw err;
      }
    },
    [setActiveMutation],
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  );

  const value = useMemo(
    () => ({
      loading,
      error,
      workspaces,
      activeWorkspace,
      activeWorkspaceId: activeWorkspace?.id ?? null,
      createWorkspace,
      renameWorkspace,
      deleteWorkspace,
      switchWorkspace,
    }),
    [
      loading,
      error,
      workspaces,
      activeWorkspace,
      createWorkspace,
      renameWorkspace,
      deleteWorkspace,
      switchWorkspace,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
