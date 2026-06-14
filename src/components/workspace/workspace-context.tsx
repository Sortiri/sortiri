"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

function applyState(
  setWorkspaces: (workspaces: Workspace[]) => void,
  setActiveWorkspaceId: (id: string | null) => void,
  state: WorkspaceState,
) {
  setWorkspaces(state.workspaces);
  setActiveWorkspaceId(state.activeWorkspaceId);
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  const loading =
    convexAuthLoading || (isAuthenticated && remoteState === undefined);

  useEffect(() => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setError(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || remoteState === undefined) return;
    if (remoteState.workspaces.length === 0) {
      void bootstrapMutation({}).catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load workspaces");
      });
      return;
    }
    applyState(setWorkspaces, setActiveWorkspaceId, remoteState);
    setError(null);
  }, [isAuthenticated, remoteState, bootstrapMutation]);

  const createWorkspace = useCallback(
    async (name: string) => {
      setError(null);
      try {
        const state = await createMutation({ name });
        applyState(setWorkspaces, setActiveWorkspaceId, state);
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
        const state = await updateMutation({ workspaceId, name });
        applyState(setWorkspaces, setActiveWorkspaceId, state);
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
        const state = await removeMutation({ workspaceId });
        applyState(setWorkspaces, setActiveWorkspaceId, state);
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
        const state = await setActiveMutation({ workspaceId });
        applyState(setWorkspaces, setActiveWorkspaceId, state);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not switch workspace");
        throw err;
      }
    },
    [setActiveMutation],
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((ws) => ws.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  );

  const value = useMemo(
    () => ({
      loading,
      error,
      workspaces,
      activeWorkspace,
      activeWorkspaceId,
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
      activeWorkspaceId,
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
