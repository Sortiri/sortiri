"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ArtifactContextValue = {
  artifactId: string | null;
  openArtifact: (id: string) => void;
  closeArtifact: () => void;
};

const ArtifactContext = createContext<ArtifactContextValue | null>(null);

export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [artifactId, setArtifactId] = useState<string | null>(null);

  const openArtifact = useCallback((id: string) => {
    setArtifactId(id);
  }, []);

  const closeArtifact = useCallback(() => {
    setArtifactId(null);
  }, []);

  return (
    <ArtifactContext.Provider value={{ artifactId, openArtifact, closeArtifact }}>
      {children}
    </ArtifactContext.Provider>
  );
}

export function useArtifactDrawer(): ArtifactContextValue {
  const context = useContext(ArtifactContext);
  if (!context) {
    throw new Error("useArtifactDrawer must be used within ArtifactProvider");
  }
  return context;
}
